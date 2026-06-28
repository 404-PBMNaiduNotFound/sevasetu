"use client"

import { useEffect, useState } from "react"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import {
  getVendorOrders,
  getUser,
  type OrderDoc,
} from "@/lib/firestore"
import { Bell, Building2, Tag, Calendar, Clipboard, CreditCard, ArrowRight, User } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

type EnrichedOrder = OrderDoc & { donorName: string }

export default function VendorNotificationsPage() {
  const [orders, setOrders] = useState<EnrichedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EnrichedOrder | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!uid) { setLoading(false); return }

    async function load() {
      setLoading(true)
      try {
        const vendorOrders = await getVendorOrders(uid!)
        // Only show orders that have payment confirmed (not failed/pending)
        const paidOrders = vendorOrders.filter((o) => o.status !== "failed")

        // Resolve donor names
        const uniqueDonorIds = [...new Set(paidOrders.map((o) => o.donorId).filter(Boolean) as string[])]
        const donorMap: Record<string, string> = {}
        await Promise.all(
          uniqueDonorIds.map(async (id) => {
            const u = await getUser(id)
            donorMap[id] = u?.name || "Unknown Donor"
          })
        )

        const enriched: EnrichedOrder[] = paidOrders
          .map((o) => ({
            ...o,
            donorName: donorMap[o.donorId || ""] || "Unknown Donor",
          }))
          .sort((a, b) => getTs(b.updatedAt || b.orderDate) - getTs(a.updatedAt || a.orderDate))

        setOrders(enriched)
      } catch (err) {
        console.error("Failed to load vendor notifications:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [uid])

  const getStatusLabel = (status: string) => {
    if (status === "payment_confirmed") return "Payment Confirmed"
    if (status === "preparing") return "Preparing"
    if (status === "ready_for_pickup") return "Ready for Pickup"
    if (status === "picked_up") return "Picked Up"
    return status
  }

  const getStatusColor = (status: string) => {
    if (status === "picked_up") return "bg-blue-100 text-blue-700"
    if (status === "ready_for_pickup") return "bg-orange-100 text-orange-700"
    if (status === "preparing") return "bg-yellow-100 text-yellow-700"
    if (status === "payment_confirmed") return "bg-green-100 text-green-700"
    return "bg-gray-100 text-gray-700"
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
            {orders.length > 0 ? `${orders.length} payment notification${orders.length > 1 ? "s" : ""}` : "No payment notifications yet"}
          </p>
        </header>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground">No payment notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Completed payment orders from donors will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => { setSelected(order); setDialogOpen(true) }}
              className="rounded-2xl border border-border bg-card p-5 transition-colors cursor-pointer hover:bg-secondary/30"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Payment Received</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium">{order.donorName}</span>
                    <ArrowRight className="inline h-3 w-3 mx-1 text-gray-400" />
                    <span className="font-medium">{order.organizationName || "Organization"}</span>
                    {" · "}₹{order.amount.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTs(order.updatedAt || order.orderDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              {selected
                ? `Payment of ₹${selected.amount.toLocaleString("en-IN")} from ${selected.donorName} to ${selected.organizationName || "the organization"}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="flex flex-col gap-4 py-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-28 shrink-0">From (Donor)</span>
                  <span className="text-sm font-semibold text-gray-900">{selected.donorName}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-28 shrink-0">To (Org)</span>
                  <span className="text-sm font-semibold text-gray-900">{selected.organizationName || "Organization"}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-28 shrink-0">Amount</span>
                  <span className="text-sm font-bold text-emerald-700">₹{selected.amount.toLocaleString("en-IN")}</span>
                </div>
                {selected.items && selected.items.length > 0 && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Clipboard className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">Items</span>
                    <div className="flex flex-col gap-0.5">
                      {selected.items.map((it, idx) => (
                        <span key={idx} className="text-sm font-medium text-gray-900">
                          {it.quantity} × {it.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500 w-28 shrink-0">Order Status</span>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(selected.status)}`}>
                    {getStatusLabel(selected.status)}
                  </span>
                </div>
                {selected.receiverName && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">Receiver</span>
                    <span className="text-sm font-medium text-gray-900">{selected.receiverName}</span>
                  </div>
                )}
                {selected.receiverAddress && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">Address</span>
                    <span className="text-sm font-medium text-gray-900">{selected.receiverAddress}</span>
                  </div>
                )}
                {(selected.updatedAt || selected.orderDate) && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 w-28 shrink-0">Date</span>
                    <span className="text-sm font-medium text-gray-900">{formatTs(selected.updatedAt || selected.orderDate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
