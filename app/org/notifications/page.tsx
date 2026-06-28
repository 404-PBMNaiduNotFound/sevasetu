"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  getOrgDonations,
  getOrgOrders,
  getUser,
  type DonationDoc,
  type OrderDoc,
} from "@/lib/firestore"
import { Bell, Building2, Tag, Calendar, Clipboard, CreditCard, Package, ArrowRight } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { formatFirestoreDate } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type NotificationItem =
  | { kind: "donation"; donation: DonationDoc; donorName: string; ts: number }
  | { kind: "payment"; order: OrderDoc; donorName: string; ts: number }

function formatTs(ts: any): string {
  if (!ts) return "—"
  const date =
    typeof ts.toDate === "function"
      ? ts.toDate()
      : typeof ts.seconds === "number"
      ? new Date(ts.seconds * 1000)
      : null
  if (!date || isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function getTs(ts: any): number {
  if (!ts) return 0
  if (typeof ts.toDate === "function") return ts.toDate().getTime()
  if (typeof ts.seconds === "number") return ts.seconds * 1000
  return 0
}

function getStatusColors(status: string) {
  if (status === "Completed") return "bg-blue-100 text-blue-700"
  if (status === "Approved") return "bg-green-100 text-green-700"
  if (status === "Rejected") return "bg-red-100 text-red-700"
  if (status === "ToBeConfirmed") return "bg-orange-100 text-orange-700"
  if (status === "Pending") return "bg-amber-100 text-amber-700"
  return "bg-gray-100 text-gray-700"
}

function getStatusLabel(status: string) {
  if (status === "ToBeConfirmed") return "Ready to Ship"
  return status
}

export default function OrgNotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<NotificationItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return }

    async function load() {
      setLoading(true)
      try {
        // Load donations that have been actioned (not just Pending)
        const [allDonations, orders] = await Promise.all([
          getOrgDonations(user!.uid),
          getOrgOrders(user!.uid),
        ])

        const actionedDonations = allDonations.filter(
          (d) => d.status !== "Pending"
        )

        // Resolve donor names for donations
        const uniqueDonorIds = [...new Set(actionedDonations.map((d) => d.donorId).filter(Boolean))]
        const donorMap: Record<string, string> = {}
        await Promise.all(
          uniqueDonorIds.map(async (id) => {
            const u = await getUser(id)
            donorMap[id] = u?.name || "Unknown Donor"
          })
        )

        // Resolve donor names for orders (vendor payment)
        const orderDonorIds = [...new Set(orders.map((o) => o.donorId).filter(Boolean) as string[])]
        await Promise.all(
          orderDonorIds.map(async (id) => {
            if (!donorMap[id]) {
              const u = await getUser(id)
              donorMap[id] = u?.name || "Unknown Donor"
            }
          })
        )

        const donationItems: NotificationItem[] = actionedDonations.map((d) => ({
          kind: "donation",
          donation: d,
          donorName: donorMap[d.donorId] || "Unknown Donor",
          ts: getTs(d.updatedAt || d.createdAt),
        }))

        // Only include orders that have completed payment (not pending)
        const paymentOrders = orders.filter(
          (o) => o.status !== "failed" && o.donorId
        )
        const paymentItems: NotificationItem[] = paymentOrders.map((o) => ({
          kind: "payment",
          order: o,
          donorName: donorMap[o.donorId || ""] || "Unknown Donor",
          ts: getTs(o.updatedAt || o.orderDate),
        }))

        const all = [...donationItems, ...paymentItems].sort((a, b) => b.ts - a.ts)
        setItems(all)
      } catch (err) {
        console.error("Failed to load org notifications:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.uid])

  const handleClick = (item: NotificationItem) => {
    setSelected(item)
    setDialogOpen(true)
  }

  const getNotifTitle = (item: NotificationItem) => {
    if (item.kind === "payment") {
      return "Payment Received"
    }
    const d = item.donation
    if (d.status === "Approved") return "Donation Approved"
    if (d.status === "Completed") return "Donation Completed"
    if (d.status === "Rejected") return "Donation Rejected"
    if (d.status === "ToBeConfirmed") return "Ready to Ship"
    return `Donation ${d.status}`
  }

  const getNotifBody = (item: NotificationItem) => {
    if (item.kind === "payment") {
      const o = item.order
      const orgName = o.organizationName || "your organization"
      return `${item.donorName} completed a vendor payment of ₹${o.amount.toLocaleString("en-IN")} for ${orgName}.`
    }
    const d = item.donation
    const donorLabel = item.donorName
    const itemLabel = d.itemName
      ? `${d.quantity ?? ""} ${d.unit || ""} of ${d.itemName}`.trim()
      : d.meals
      ? `${d.meals} meals`
      : "a donation"
    if (d.status === "Approved") return `You approved ${donorLabel}'s donation of ${itemLabel}.`
    if (d.status === "Completed") return `${donorLabel}'s donation of ${itemLabel} has been marked completed.`
    if (d.status === "Rejected") return `You rejected ${donorLabel}'s donation request.`
    if (d.status === "ToBeConfirmed") return `${donorLabel}'s donation of ${itemLabel} is packed and ready to ship.`
    return `${donorLabel}'s donation status changed to ${d.status}.`
  }

  const getNotifTs = (item: NotificationItem) => {
    if (item.kind === "payment") return formatTs(item.order.updatedAt || item.order.orderDate)
    return formatFirestoreDate(item.donation.updatedAt || item.donation.createdAt)
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <header>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Notifications</h1>
          <p className="mt-2 text-sm text-white/80">
            {items.length > 0 ? `${items.length} recent update${items.length > 1 ? "s" : ""}` : "No updates yet"}
          </p>
        </header>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground">No notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Donation and payment updates will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => {
            const isPmt = item.kind === "payment"
            return (
              <div
                key={i}
                onClick={() => handleClick(item)}
                className="rounded-2xl border border-border bg-card p-5 transition-colors cursor-pointer hover:bg-secondary/30"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isPmt ? "bg-emerald-100" : "bg-blue-100"}`}>
                    {isPmt
                      ? <CreditCard className="h-4 w-4 text-emerald-600" />
                      : <Package className="h-4 w-4 text-blue-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{getNotifTitle(item)}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{getNotifBody(item)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{getNotifTs(item)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? getNotifTitle(selected) : ""}</DialogTitle>
            <DialogDescription>{selected ? getNotifBody(selected) : ""}</DialogDescription>
          </DialogHeader>

          {selected?.kind === "donation" && (() => {
            const d = selected.donation
            const isRequirement = d.requirementId || d.itemName
            const donationType = isRequirement ? "Item Donation" : d.mealType ? `${d.mealType} Sponsorship` : "Meal Sponsorship"
            const detailStr = isRequirement
              ? `${d.quantity ?? 0} ${d.unit || ""} of ${d.itemName || "items"}`
              : d.meals
              ? `${d.mealType ? `${d.mealType} · ` : ""}${d.meals} meals`
              : "—"
            const proofImage = d.completedProofUrl || d.donateProofUrl || null
            return (
              <div className="flex flex-col gap-4 py-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Donor</span>
                    <span className="text-sm font-semibold text-gray-900">{selected.donorName}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Type</span>
                    <span className="text-sm font-medium text-gray-900">{donationType}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Clipboard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Details</span>
                    <span className="text-sm font-medium text-gray-900">{detailStr}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-24 shrink-0">Status</span>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColors(d.status)}`}>
                      {getStatusLabel(d.status)}
                    </span>
                  </div>
                  {d.occasion && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 w-24 shrink-0">Occasion</span>
                      <span className="text-sm font-medium text-gray-900">{d.occasion}</span>
                    </div>
                  )}
                  {d.updatedAt && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 w-24 shrink-0">Updated</span>
                      <span className="text-sm font-medium text-gray-900">{formatFirestoreDate(d.updatedAt)}</span>
                    </div>
                  )}
                </div>
                {d.notes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500">Notes</span>
                    <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">{d.notes}</p>
                  </div>
                )}
                {proofImage && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {d.status === "Completed" ? "Completion Proof" : "Dispatch Proof"}
                    </span>
                    <div className="rounded-xl overflow-hidden border border-gray-100">
                      <img src={proofImage} alt="Proof photo" className="w-full object-cover max-h-56" />
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {selected?.kind === "payment" && (() => {
            const o = selected.order
            const statusLabel =
              o.status === "payment_confirmed" ? "Payment Confirmed"
              : o.status === "preparing" ? "Preparing"
              : o.status === "ready_for_pickup" ? "Ready for Pickup"
              : o.status === "picked_up" ? "Picked Up"
              : o.status
            const statusColor =
              o.status === "picked_up" ? "bg-blue-100 text-blue-700"
              : o.status === "ready_for_pickup" ? "bg-orange-100 text-orange-700"
              : "bg-green-100 text-green-700"
            return (
              <div className="flex flex-col gap-4 py-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">From (Donor)</span>
                    <span className="text-sm font-semibold text-gray-900">{selected.donorName}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">To (Org)</span>
                    <span className="text-sm font-semibold text-gray-900">{o.organizationName || "Your Organization"}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">Amount</span>
                    <span className="text-sm font-semibold text-emerald-700">₹{o.amount.toLocaleString("en-IN")}</span>
                  </div>
                  {o.vendorName && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 w-28 shrink-0">Vendor</span>
                      <span className="text-sm font-medium text-gray-900">{o.vendorName}</span>
                    </div>
                  )}
                  {o.items && o.items.length > 0 && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Clipboard className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-500 w-28 shrink-0">Items</span>
                      <div className="flex flex-col gap-0.5">
                        {o.items.map((it, idx) => (
                          <span key={idx} className="text-sm font-medium text-gray-900">
                            {it.quantity} × {it.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">Order Status</span>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {(o.updatedAt || o.orderDate) && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 w-28 shrink-0">Date</span>
                      <span className="text-sm font-medium text-gray-900">{formatTs(o.updatedAt || o.orderDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
