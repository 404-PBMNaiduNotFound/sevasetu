"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  subscribeToNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getDonorDonations,
  getOrganizations,
  type NotificationDoc,
  type DonationDoc,
} from "@/lib/firestore"
import { Bell, CheckCheck, Building2, Tag, Calendar, MessageSquare, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatFirestoreDate } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [donations, setDonations] = useState<DonationDoc[]>([])
  const [orgMap, setOrgMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [selectedNotif, setSelectedNotif] = useState<NotificationDoc | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }
    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs)
      setLoading(false)
    })

    Promise.all([
      getDonorDonations(user.uid),
      getOrganizations()
    ]).then(([donationsList, orgsList]) => {
      setDonations(donationsList)
      const mapping: Record<string, string> = {}
      orgsList.forEach((org) => {
        const id = org.uid || org.orgId
        if (id) {
          mapping[id] = org.organizationName || org.name || "Unknown Organization"
        }
      })
      setOrgMap(mapping)
    }).catch((err) => console.error("Failed to load donations and organizations:", err))

    return () => unsub()
  }, [user?.uid])

  const handleMarkAll = async () => {
    if (!user?.uid) return
    await markAllNotificationsRead(user.uid)
  }

  const handleNotifClick = async (notif: NotificationDoc) => {
    setSelectedNotif(notif)
    setDialogOpen(true)
    if (!notif.read && notif.id) {
      await markNotificationRead(notif.id)
    }
  }

  const findMatchingDonation = (notif: NotificationDoc, donationList: DonationDoc[]): DonationDoc | undefined => {
    const occasionMatch = notif.body.match(/for "([^"]+)"/)
    if (occasionMatch) {
      const occasion = occasionMatch[1]
      const matched = donationList.find((d) => d.occasion === occasion)
      if (matched) return matched
    }

    const notifTime = notif.createdAt?.seconds || (notif.createdAt as any)?.seconds
    if (notifTime) {
      const matched = donationList.find((d) => {
        const dTime =
          d.updatedAt?.seconds ||
          (d.updatedAt as any)?.seconds ||
          d.createdAt?.seconds ||
          (d.createdAt as any)?.seconds
        return dTime && Math.abs(notifTime - dTime) < 30
      })
      if (matched) return matched
    }

    let status: string | null = null
    if (notif.title.includes("Approved")) status = "Approved"
    else if (notif.title.includes("Completed")) status = "Completed"
    else if (notif.title.includes("Rejected")) status = "Rejected"

    if (status) {
      const matched = donationList.find((d) => d.status === status)
      if (matched) return matched
    }

    return undefined
  }

  const getDonationDetails = (notif: NotificationDoc, donation?: DonationDoc) => {
    const orgName = (donation && donation.organizationId ? orgMap[donation.organizationId] : null) || donation?.organizationName || "DonateConnect Partner"
    const isRequirement = donation?.requirementId || donation?.itemName
    const donationType = isRequirement ? "Item Donation" : donation?.mealType ? `${donation.mealType} Sponsorship` : "Meal Sponsorship"

    let details = ""
    if (isRequirement) {
      details = `${donation?.quantity ?? 0} ${donation?.unit || ""} of ${donation?.itemName || "items"}`
    } else if (donation?.meals) {
      details = `${donation.mealType ? `${donation.mealType} · ` : ""}${donation.meals} meals`
    } else {
      const mealsMatch = notif.body.match(/(\d+)\s+meals/)
      details = mealsMatch ? `${mealsMatch[1]} meals` : "Meal Sponsorship"
    }

    const status =
      donation?.status ||
      (notif.title.includes("Approved")
        ? "Approved"
        : notif.title.includes("Completed")
        ? "Completed"
        : notif.title.includes("Rejected")
        ? "Rejected"
        : "Pending")

    const getRequestDate = () => {
      if (donation?.submissionDate) {
        const d = new Date(donation.submissionDate)
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        }
      }
      if (donation?.createdAt) {
        const formatted = formatFirestoreDate(donation.createdAt)
        if (formatted !== "—") return formatted
      }
      return null
    }

    const getApprovedDate = () => {
      if (donation?.status === "Approved" && donation?.updatedAt) {
        const formatted = formatFirestoreDate(donation.updatedAt)
        if (formatted !== "—") return formatted
      }
      return null
    }

    const getCompletedDate = () => {
      if (donation?.status === "Completed") {
        const ts = donation.completedAt || donation.updatedAt
        if (ts) {
          const formatted = formatFirestoreDate(ts)
          if (formatted !== "—") return formatted
        }
      }
      return null
    }

    return {
      orgName,
      donationType,
      details,
      status,
      occasion: donation?.occasion || "",
      message: donation?.message || "",
      notes: donation?.notes || "",
      requestedDate: getRequestDate(),
      approvedDate: getApprovedDate(),
      completedDate: getCompletedDate(),
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const matchedDonation = selectedNotif ? findMatchingDonation(selectedNotif, donations) : undefined
  const details = selectedNotif ? getDonationDetails(selectedNotif, matchedDonation) : null

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <header>
          <h1 className="text-2xl font-bold text-white text-foreground md:text-3xl">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground text-white">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </header>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAll} variant="outline" className="rounded-xl gap-2 shrink-0">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground">No notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll see updates about your donations here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`rounded-2xl border p-5 transition-colors cursor-pointer hover:bg-secondary/30 ${
                notif.read
                  ? "border-border bg-card"
                  : "border-primary/20 bg-primary/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-semibold ${notif.read ? "text-foreground" : "text-primary"}`}>
                    {notif.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{notif.body}</p>
                </div>
                {!notif.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{formatFirestoreDate(notif.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNotif?.title}</DialogTitle>
            <DialogDescription>{selectedNotif?.body}</DialogDescription>
          </DialogHeader>

          {details && (
            <div className="flex flex-col gap-4 py-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-24 shrink-0">Organization</span>
                  <span className="text-sm font-semibold text-gray-900">{details.orgName}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-24 shrink-0">Donation Type</span>
                  <span className="text-sm font-medium text-gray-900">{details.donationType}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Clipboard className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-24 shrink-0">Details</span>
                  <span className="text-sm font-medium text-gray-900">{details.details}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-24 shrink-0">Status</span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      details.status === "Completed"
                        ? "bg-blue-100 text-blue-700"
                        : details.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : details.status === "Rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {details.status}
                  </span>
                </div>

                {details.requestedDate && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Requested Date</span>
                    <span className="text-sm font-medium text-gray-900">{details.requestedDate}</span>
                  </div>
                )}

                {details.approvedDate && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Approved Date</span>
                    <span className="text-sm font-medium text-gray-900">{details.approvedDate}</span>
                  </div>
                )}

                {details.completedDate && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Completed Date</span>
                    <span className="text-sm font-medium text-gray-900">{details.completedDate}</span>
                  </div>
                )}
              </div>

              {details.occasion && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-gray-500">Occasion</span>
                  <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">
                    {details.occasion}
                  </p>
                </div>
              )}

              {details.message && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-gray-500">Your Message</span>
                  <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">
                    {details.message}
                  </p>
                </div>
              )}

              {details.notes && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-gray-500">Organization Notes</span>
                  <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">
                    {details.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}