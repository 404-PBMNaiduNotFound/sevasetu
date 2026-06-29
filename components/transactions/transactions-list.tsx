"use client"

import { useState, useEffect } from "react"
import { OrderDoc, markOrderReadyForPickup, markOrderPickedUp, cancelOrderByDonor } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { uploadProofImage } from "@/lib/storage"
import { ProofPhotoModal } from "@/components/shared/proof-photo-modal"
import { ProofImageBadge } from "@/components/shared/proof-image-badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, Package, Clock, CheckCircle, Truck, Send, XCircle, Ban, AlertTriangle, X, Loader2 } from "lucide-react"
import { formatFirestoreDate, tsToDate } from "@/lib/utils"

interface TransactionsListProps {
  transactions: OrderDoc[]
  loading: boolean
  userRole: "donor" | "organization" | "vendor"
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  payment_confirmed: {
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Payment Confirmed",
  },
  preparing: {
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    icon: <Clock className="w-4 h-4" />,
    label: "Preparing",
  },
  ready_for_pickup: {
    color: "bg-purple-100 text-purple-700 border-purple-300",
    icon: <Package className="w-4 h-4" />,
    label: "Ready for Pickup",
  },
  picked_up: {
    color: "bg-green-100 text-success-green border-green-300",
    icon: <Truck className="w-4 h-4" />,
    label: "Picked Up",
  },
  failed: {
    color: "bg-red-100 text-red-700 border-red-300",
    icon: <XCircle className="w-4 h-4" />,
    label: "Failed / Cancelled",
  },
  cancelled_by_donor: {
    color: "bg-gray-100 text-gray-700 border-gray-300",
    icon: <Ban className="w-4 h-4" />,
    label: "Cancelled by Donor",
  },
}

// Donor can still back out of an order at any of these stages — once it's
// "picked_up" the donation is considered fulfilled.
const DONOR_CANCELLABLE_STATUSES = ["payment_confirmed", "preparing", "ready_for_pickup"]

type FilterStatus = "all" | "payment_completed" | "payment_confirmed" | "preparing" | "ready_for_pickup" | "picked_up" | "failed" | "cancelled_by_donor"

export function TransactionsList({ transactions, loading, userRole }: TransactionsListProps) {
  const { user } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [readyLoadingId, setReadyLoadingId] = useState<string | null>(null)
  const [pickupLoadingId, setPickupLoadingId] = useState<string | null>(null)
  const [localTransactions, setLocalTransactions] = useState<OrderDoc[]>(transactions)
  const [readyProofTargetId, setReadyProofTargetId] = useState<string | null>(null)
  const [pickupProofTargetId, setPickupProofTargetId] = useState<string | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    // Failed orders carry no real spend and are not actionable — hide them
    // everywhere, including the donor's own view. Donor-cancelled orders
    // ARE shown (just like every other status) since payment did succeed
    // and the cancellation/refund is something every role should see.
    const visible = transactions.filter((t) => t.status !== "failed")
    setLocalTransactions(visible)
  }, [transactions, userRole])

  const handleCancelOrder = async (orderId: string) => {
    if (!user) return
    setCancelLoadingId(orderId)
    setCancelError(null)
    try {
      await cancelOrderByDonor(orderId, user.uid)
      setLocalTransactions((prev) =>
        prev.map((t) => (t.id === orderId ? { ...t, status: "cancelled_by_donor" as const } : t))
      )
      setCancelTargetId(null)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel order")
    } finally {
      setCancelLoadingId(null)
    }
  }

  const handleMarkReadyForShipConfirm = async (orderId: string, file: File) => {
    setReadyLoadingId(orderId)
    try {
      const proofUrl = await uploadProofImage(orderId, "ready_for_pickup", file)
      await markOrderReadyForPickup(orderId, proofUrl)
      setLocalTransactions((prev) =>
        prev.map((t) =>
          t.id === orderId ? { ...t, status: "ready_for_pickup" as const, readyForPickupProofUrl: proofUrl } : t
        )
      )
    } finally {
      setReadyLoadingId(null)
    }
  }

  const handleMarkPickedUpConfirm = async (orderId: string, file: File) => {
    setPickupLoadingId(orderId)
    try {
      const proofUrl = await uploadProofImage(orderId, "picked_up", file)
      await markOrderPickedUp(orderId, proofUrl)
      setLocalTransactions((prev) =>
        prev.map((t) =>
          t.id === orderId ? { ...t, status: "picked_up" as const, pickedUpProofUrl: proofUrl } : t
        )
      )
    } finally {
      setPickupLoadingId(null)
    }
  }

  const PAYMENT_COMPLETED_STATUSES = ["preparing", "ready_for_pickup", "picked_up"] as const

  const filteredTransactions =
    filterStatus === "all"
      ? localTransactions
      : filterStatus === "payment_completed"
      ? localTransactions.filter((t) => PAYMENT_COMPLETED_STATUSES.includes(t.status as any))
      : localTransactions.filter((t) => t.status === filterStatus)

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </Card>
    )
  }

  if (localTransactions.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No transactions yet</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Total Spent Summary — donors and orgs only; vendors don't "spend".
          Cancelled-by-donor orders are excluded since that money was refunded. */}
      {userRole !== "vendor" && (
        <Card className="p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-xl font-bold text-success-green">
            ₹{localTransactions
              .filter((t) => t.status !== "cancelled_by_donor")
              .reduce((sum, t) => sum + (t.amount || 0), 0)
              .toFixed(2)}
          </p>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterStatus === "all" ? "default" : "outline"}
          onClick={() => setFilterStatus("all")}
          className={filterStatus === "all" ? "bg-navy-primary" : ""}
        >
          All ({localTransactions.length})
        </Button>

        {/* Payment Completed — groups preparing + ready_for_pickup + picked_up */}
        <Button
          size="sm"
          variant={filterStatus === "payment_completed" ? "default" : "outline"}
          onClick={() => setFilterStatus("payment_completed")}
          className={filterStatus === "payment_completed" ? "bg-navy-primary" : ""}
        >
          Payment Completed ({localTransactions.filter((t) => ["preparing", "ready_for_pickup", "picked_up"].includes(t.status)).length})
        </Button>

        {/* Individual status tabs */}
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          // Payment Confirmed tab removed — already covered under "Payment Completed" / "All"
          if (key === "payment_confirmed") return null
          // Failed orders are hidden entirely — no tab needed. Donor-cancelled
          // orders DO get a tab since, unlike "failed", they're a real,
          // visible-to-everyone outcome (payment succeeded, then refunded).
          if (key === "failed") return null
          // Org already has a dedicated "Ready to Ship" page (sidebar) for
          // this exact view — avoid duplicating it here for that role
          if (key === "ready_for_pickup" && userRole === "organization") return null
          const count = localTransactions.filter((t) => t.status === key).length
          return (
            <Button
              key={key}
              size="sm"
              variant={filterStatus === key ? "default" : "outline"}
              onClick={() => setFilterStatus(key as FilterStatus)}
              className={filterStatus === key ? "bg-navy-primary" : ""}
            >
              {config.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {filteredTransactions.map((transaction) => {
          const statusConfig = STATUS_CONFIG[transaction.status]
          const isExpanded = expandedId === transaction.id

          return (
            <Card
              key={transaction.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : transaction.id || "")
                }
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                      {statusConfig.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-primary">
                        Order #{transaction.orderId}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const d = tsToDate(transaction.orderDate ?? transaction.updatedAt)
                          return d
                            ? d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                            : "—"
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                    {userRole === "donor" && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Vendor</p>
                          <p className="font-medium">{transaction.vendorName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Organization</p>
                          <p className="font-medium">
                            {transaction.organizationName}
                          </p>
                        </div>
                      </>
                    )}
                    {userRole === "organization" && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Donor</p>
                          <p className="font-medium">{transaction.donorName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vendor</p>
                          <p className="font-medium">{transaction.vendorName}</p>
                        </div>
                      </>
                    )}
                    {userRole === "vendor" && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Donor</p>
                          <p className="font-medium">{transaction.donorName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Organization</p>
                          <p className="font-medium">
                            {transaction.organizationName}
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className={`font-medium inline-block px-2 py-1 rounded text-xs ${statusConfig.color}`}>
                        {statusConfig.label}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-bold text-success-green">
                        ₹{transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  } text-muted-foreground`}
                />
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-navy-primary mb-3">
                      Items
                    </h4>
                    <div className="space-y-2">
                      {transaction.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm p-2 bg-background rounded"
                        >
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">
                            {item.quantity} × ₹{item.price} = ₹
                            {(item.quantity * item.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-semibold text-navy-primary mb-3">
                      Organization Address
                    </h4>
                    <div className="text-sm space-y-1 bg-background p-3 rounded">
                      <p className="font-medium">{transaction.receiverName}</p>
                      <p className="text-muted-foreground">
                        {transaction.receiverPhone}
                      </p>
                      <p className="text-muted-foreground">
                        {transaction.receiverAddress}
                      </p>
                    </div>
                  </div>

                  {transaction.notes && (
                    <div className="border-t border-border pt-4">
                      <h4 className="font-semibold text-navy-primary mb-2">
                        Notes
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {transaction.notes}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-border pt-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold text-vendor-orange">
                        ₹{transaction.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {transaction.readyForPickupProofUrl && (
                        <ProofImageBadge url={transaction.readyForPickupProofUrl} label="Ready Proof" />
                      )}
                      {transaction.pickedUpProofUrl && (
                        <ProofImageBadge url={transaction.pickedUpProofUrl} label="Pickup Proof" />
                      )}

                      {/* Vendor: Ready for Ship — only when payment is confirmed and order not yet dispatched */}
                      {userRole === "vendor" &&
                        (transaction.status === "payment_confirmed" || transaction.status === "preparing") && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            disabled={readyLoadingId === transaction.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setReadyProofTargetId(transaction.id ?? null)
                            }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {readyLoadingId === transaction.id ? "Updating…" : "Ready for Ship"}
                          </Button>
                        )}

                      {/* Org: Mark Picked Up — only when vendor has marked it ready */}
                      {userRole === "organization" &&
                        transaction.status === "ready_for_pickup" && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-1"
                            disabled={pickupLoadingId === transaction.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPickupProofTargetId(transaction.id ?? null)
                            }}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            {pickupLoadingId === transaction.id ? "Updating…" : "Mark Picked Up"}
                          </Button>
                        )}

                      {/* Donor: Cancel Order — only while the order hasn't been picked up yet.
                          Triggers a real Razorpay refund and marks the order/donation cancelled
                          for every role to see. */}
                      {userRole === "donor" &&
                        DONOR_CANCELLABLE_STATUSES.includes(transaction.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 gap-1"
                            disabled={cancelLoadingId === transaction.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setCancelError(null)
                              setCancelTargetId(transaction.id ?? null)
                            }}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {cancelLoadingId === transaction.id ? "Cancelling…" : "Cancel Order"}
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {filteredTransactions.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <p className="text-muted-foreground">
                No transactions with status "{filterStatus}"
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Proof photo modal — required before "Ready for Ship" goes through */}
      <ProofPhotoModal
        open={Boolean(readyProofTargetId)}
        onOpenChange={(open) => { if (!open) setReadyProofTargetId(null) }}
        title="Mark Ready for Pickup"
        description="Attach a photo of the packed order as proof before marking it ready for the organisation to collect."
        confirmLabel="Confirm & Mark Ready"
        onConfirm={async (file) => {
          if (readyProofTargetId) await handleMarkReadyForShipConfirm(readyProofTargetId, file)
        }}
      />

      {/* Proof photo modal — required before "Mark Picked Up" goes through */}
      <ProofPhotoModal
        open={Boolean(pickupProofTargetId)}
        onOpenChange={(open) => { if (!open) setPickupProofTargetId(null) }}
        title="Mark Picked Up"
        description="Attach a photo confirming the order has been collected from the vendor as proof before marking it picked up."
        confirmLabel="Confirm & Mark Picked Up"
        onConfirm={async (file) => {
          if (pickupProofTargetId) await handleMarkPickedUpConfirm(pickupProofTargetId, file)
        }}
      />

      {/* Cancel order confirmation — donor only. Triggers a real refund, so this
          needs an explicit confirm step rather than firing on a single click. */}
      {cancelTargetId && (() => {
        const target = localTransactions.find((t) => t.id === cancelTargetId)
        if (!target) return null
        const isCancelling = cancelLoadingId === cancelTargetId
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && !isCancelling) setCancelTargetId(null) }}
          >
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base">Cancel this order?</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Order #{target.orderId} for{" "}
                    <span className="font-medium text-gray-800">₹{target.amount.toFixed(2)}</span> will be cancelled
                    and refunded to your original payment method. This cannot be undone.
                  </p>
                </div>
                {!isCancelling && (
                  <button onClick={() => setCancelTargetId(null)} className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {cancelError && (
                <p className="mt-3 text-sm text-red-600">{cancelError}</p>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleCancelOrder(cancelTargetId)}
                  disabled={isCancelling}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {isCancelling ? "Cancelling…" : "Yes, cancel & refund"}
                </button>
                <button
                  onClick={() => setCancelTargetId(null)}
                  disabled={isCancelling}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  Keep Order
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}