"use client"

import { useEffect, useMemo, useState } from "react"
import { getDonorDonations, getOrganizations, type DonationDoc, type OrganizationDoc } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { StatusBadge } from "@/components/donor/status-badge"
import { Spinner } from "@/components/ui/spinner"
import {
  HandHeart,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  MessageSquareText,
  Gift,
  Hourglass,
} from "lucide-react"
import { formatFirestoreDate, tsToDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

type FilterStatus = "all" | "approved" | "rejected" | "pending"

function sortByRecent(list: DonationDoc[]): DonationDoc[] {
  return [...list].sort((a, b) => {
    const aTs = tsToDate(a.createdAt ?? a.updatedAt)?.getTime() ?? 0
    const bTs = tsToDate(b.createdAt ?? b.updatedAt)?.getTime() ?? 0
    return bTs - aTs
  })
}

export default function RequestsPage() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<DonationDoc[]>([])
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDonation, setSelectedDonation] = useState<DonationDoc | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all")

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return }
    Promise.all([
      getDonorDonations(user.uid),
      getOrganizations()
    ])
      .then(([donationsData, orgsData]) => {
        setDonations(sortByRecent(donationsData))
        setOrganizations(orgsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user?.uid])

  const getOrgName = (id: string) => organizations.find(o => o.orgId === id || o.uid === id)?.name || organizations.find(o => o.orgId === id || o.uid === id)?.organizationName || "Unknown Organization"

  const approvedDonations = useMemo(
    () => donations.filter((d) => d.status?.toLowerCase() === "approved" || d.status?.toLowerCase() === "completed"),
    [donations]
  )
  const rejectedDonations = useMemo(
    () => donations.filter((d) => d.status?.toLowerCase() === "rejected"),
    [donations]
  )
  const pendingDonations = useMemo(
    () => donations.filter((d) => d.status?.toLowerCase() === "pending"),
    [donations]
  )

  const filteredDonations = useMemo(() => {
    if (activeFilter === "approved") return approvedDonations
    if (activeFilter === "rejected") return rejectedDonations
    if (activeFilter === "pending") return pendingDonations
    return donations
  }, [activeFilter, donations, approvedDonations, rejectedDonations, pendingDonations])

  const statCards: {
    key: FilterStatus
    label: string
    value: number
    icon: React.ElementType
    activeRing: string
    activeHover: string
    iconBg: string
    iconColor: string
    valuteColor: string
  }[] = [
    {
      key: "all",
      label: "All Requests",
      value: donations.length,
      icon: Gift,
      activeRing: "border-primary bg-primary/5",
      activeHover: "hover:border-primary/40",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      valuteColor: "text-foreground",
    },
    {
      key: "approved",
      label: "Approved",
      value: approvedDonations.length,
      icon: CheckCircle2,
      activeRing: "border-green-500 bg-green-50",
      activeHover: "hover:border-green-300",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      valuteColor: "text-green-700",
    },
    {
      key: "pending",
      label: "Still Pending",
      value: pendingDonations.length,
      icon: Hourglass,
      activeRing: "border-amber-500 bg-amber-50",
      activeHover: "hover:border-amber-300",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      valuteColor: "text-amber-700",
    },
    {
      key: "rejected",
      label: "Rejected",
      value: rejectedDonations.length,
      icon: XCircle,
      activeRing: "border-red-500 bg-red-50",
      activeHover: "hover:border-red-300",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      valuteColor: "text-red-700",
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-8">
              <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <header>
          <h1 className="text-2xl text-white font-bold text-foreground md:text-3xl">My Requests</h1>
          <p className="mt-2 text-sm text-white text-muted-foreground">
            Track all your sponsorship requests and their current status.
          </p>
        </header></div>

        {donations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <HandHeart className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 font-semibold text-foreground">No requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse organizations and sponsor a slot to get started.
            </p>
          </div>
        ) : (
          <>
            {/* ── Clickable stat cards ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {statCards.map((card) => {
                const isActive = activeFilter === card.key
                const Icon = card.icon
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setActiveFilter(card.key)}
                    className={cn(
                      "rounded-2xl border p-5 text-left shadow-sm transition-all duration-150",
                      isActive ? card.activeRing + " ring-2 ring-offset-0" : "border-border bg-card " + card.activeHover
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", isActive ? card.iconBg : "bg-muted")}>
                        <Icon className={cn("h-4 w-4", isActive ? card.iconColor : "text-muted-foreground")} />
                      </span>
                    </div>
                    <p className={cn("mt-2 text-2xl font-bold", isActive ? card.valuteColor : "text-foreground")}>
                      {card.value}
                    </p>
                    {isActive && (
                      <p className={cn("mt-0.5 text-xs font-medium", card.iconColor)}>Showing these ↓</p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Filter pills ── */}
            <div className="flex flex-wrap items-center gap-2">
              {statCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setActiveFilter(card.key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition",
                    activeFilter === card.key
                      ? card.key === "all"
                        ? "bg-primary text-primary-foreground"
                        : card.key === "approved"
                        ? "bg-green-600 text-white"
                        : card.key === "pending"
                        ? "bg-amber-500 text-white"
                        : "bg-red-600 text-white"
                      : card.key === "approved"
                      ? "bg-green-100 text-green-700"
                      : card.key === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : card.key === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {card.label}
                  <span className="ml-1.5 opacity-70">{card.value}</span>
                </button>
              ))}
            </div>

            {filteredDonations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="font-semibold text-foreground">No {activeFilter === "all" ? "" : activeFilter} requests found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredDonations.map((donation) => (
                  <button
                    key={donation.id}
                    type="button"
                    onClick={() => setSelectedDonation(donation)}
                    className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {donation.isOwnItem
                                ? donation.itemName || "Own Item Donation"
                                : donation.occasion || "Sponsorship"}
                            </p>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              donation.isOwnItem
                                ? "bg-purple-100 text-purple-700"
                                : donation.requirementId
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {donation.isOwnItem ? "Self Donation" : donation.requirementId ? "Item Donation" : donation.mealType ? `${donation.mealType} Sponsorship` : "Meal Sponsorship"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                            To: {getOrgName(donation.organizationId)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {donation.submissionDate ? new Date(donation.submissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : formatFirestoreDate(donation.createdAt ?? donation.updatedAt)}
                            </span>
                            {donation.slotId && donation.donationDate && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <Clock className="h-3 w-3" />
                                Slot: {new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                              <Gift className="h-3.5 w-3.5 text-primary" />
                              {donation.isOwnItem ? (
                                `Self Donation · ${donation.itemName || "Items"}${donation.quantity ? ` · ${donation.quantity} ${donation.unit || ""}` : ""}`
                              ) : donation.requirementId ? (
                                `${donation.itemName ? `${donation.itemName} · ` : ""}Qty: ${donation.quantity ?? 0} ${donation.unit || ""}`
                              ) : (
                                `${donation.mealType ? `${donation.mealType} · ` : ""}${donation.meals ? `${donation.meals} meals` : "Meal Sponsorship"}`
                              )}
                            </span>
                            {donation.originalQuantity != null && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                Trimmed · requested {donation.originalQuantity} {donation.unit || "units"}
                              </span>
                            )}

                          </div>
                          {donation.message && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {donation.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={donation.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex flex-col items-center border-b border-border pb-6">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-8 w-8" />
              </span>
              <h3 className="mt-4 text-xl font-bold text-foreground">
                {selectedDonation.isOwnItem
                  ? selectedDonation.itemName || "Own Item Donation"
                  : selectedDonation.occasion || "Sponsorship"}
              </h3>
              <span className={cn(
                "mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                selectedDonation.isOwnItem
                  ? "bg-purple-100 text-purple-700"
                  : selectedDonation.requirementId
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {selectedDonation.isOwnItem ? "Self Donation" : selectedDonation.requirementId ? "Item Donation" : selectedDonation.mealType ? `${selectedDonation.mealType} Sponsorship` : "Meal Sponsorship"}
              </span>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                To: {getOrgName(selectedDonation.organizationId)}
              </p>
              <div className="mt-4">
                <StatusBadge status={selectedDonation.status} />
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Request Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDonation(null)}
                className="rounded-lg px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-2">
                  <StatusBadge status={selectedDonation.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Donation Details</p>
                  <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-foreground">
                    <Gift className="h-4 w-4 text-primary" />
                    {selectedDonation.isOwnItem ? (
                      `Self Donation · ${selectedDonation.itemName || "Items"}${selectedDonation.quantity ? ` · ${selectedDonation.quantity} ${selectedDonation.unit || ""}` : ""}`
                    ) : selectedDonation.requirementId ? (
                      `${selectedDonation.itemName ? `${selectedDonation.itemName} · ` : ""}Qty: ${selectedDonation.quantity ?? 0} ${selectedDonation.unit || ""}`
                    ) : (
                      `${selectedDonation.mealType ? `${selectedDonation.mealType} · ` : ""}${selectedDonation.meals ? `${selectedDonation.meals} meals` : "Meal Sponsorship"}`
                    )}
                  </p>
                  {selectedDonation.originalQuantity != null && (
                    <p className="mt-1.5 text-sm text-amber-600 dark:text-amber-400">
                      Originally requested {selectedDonation.originalQuantity} {selectedDonation.unit || "units"} — reduced to what remained on the requirement.
                    </p>
                  )}
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Request Date</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {selectedDonation.submissionDate ? new Date(selectedDonation.submissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : formatFirestoreDate(selectedDonation.createdAt ?? selectedDonation.updatedAt)}
                  </p>
                </div>
              </div>

              {selectedDonation.slotId && selectedDonation.donationDate && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-blue-600 font-medium">Slot Sponsored Date</p>
                  <p className="mt-1 text-lg font-semibold text-blue-800">
                    {new Date(selectedDonation.donationDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  {selectedDonation.mealType && (
                    <p className="mt-0.5 text-sm text-blue-600">{selectedDonation.mealType}</p>
                  )}
                </div>
              )}

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Occasion</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedDonation.occasion || "-"}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquareText className="h-4 w-4" />
                  Message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-foreground">
                  {selectedDonation.message || "No message provided"}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Request ID</p>
                <p className="mt-1 break-all text-foreground">{selectedDonation.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}