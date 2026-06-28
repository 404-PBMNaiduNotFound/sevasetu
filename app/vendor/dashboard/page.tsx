'use client'

import { useEffect, useState } from 'react'
import { Package, DollarSign, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/vendor/status-pill'
import { DashboardStatsCard } from '@/components/vendor/dashboard-stats-card'
import { VerificationBanner } from '@/components/vendor/verification-banner'
import { useAuth } from '@/lib/auth-context'
import { formatFirestoreDate } from '@/lib/utils'
import {
  subscribeToVendor,
  subscribeToVendorOrders,
  markOrderReadyForPickup,
  type VendorDoc,
  type OrderDoc,
} from '@/lib/firestore'
import { uploadProofImage } from '@/lib/storage'
import { ProofPhotoModal } from '@/components/shared/proof-photo-modal'
import { ProofImageBadge } from '@/components/shared/proof-image-badge'

interface OrderWithDetails extends OrderDoc {
  isExpanded: boolean
}

export default function VendorDashboard() {
  const { user } = useAuth()
  const vendorId = user?.uid ?? ''

  const [vendor, setVendor] = useState<VendorDoc | null>(null)
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readyProofTargetId, setReadyProofTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (!vendorId) return

    const unsubscribeVendor = subscribeToVendor(vendorId, setVendor)
    const unsubscribeOrders = subscribeToVendorOrders(vendorId, (fetchedOrders) => {
      setOrders(
        fetchedOrders
          .filter((order) => order.status !== 'failed')
          .map((order) => ({
            ...order,
            isExpanded: false,
          }))
      )
      setIsLoading(false)
    })

    return () => {
      unsubscribeVendor()
      unsubscribeOrders()
    }
  }, [vendorId])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-muted" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Vendor profile not found</p>
        </div>
      </div>
    )
  }

  const totalOrders = orders.length
  const readyForPickup = orders.filter((o) => o.status === 'ready_for_pickup').length
  const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0)

  const handleMarkReadyConfirm = async (orderId: string, file: File) => {
    const proofUrl = await uploadProofImage(orderId, "ready_for_pickup", file)
    await markOrderReadyForPickup(orderId, proofUrl)
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: 'ready_for_pickup', readyForPickupProofUrl: proofUrl } : order
      )
    )
  }

  const toggleOrderDetails = (orderId: string) => {
    if (!orderId) return
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, isExpanded: !order.isExpanded } : order
      )
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Vendor Dashboard</h1>
            <p className="mt-2 text-sm text-white/80">{vendor.businessName}</p>
          </div>
                  </div>
      </div>

      {/* Verification Banner */}
      <div className="mb-6">
        <VerificationBanner status={vendor.approvalStatus} />
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatsCard
          label="Total Orders"
          value={totalOrders}
          icon={Package}
        />
        <DashboardStatsCard
          label="Ready for Pickup"
          value={readyForPickup}
          icon={TrendingUp}
        />
        <DashboardStatsCard
          label="Total Revenue"
          value={`₹${totalAmount.toLocaleString()}`}
          icon={DollarSign}
        />
        <DashboardStatsCard
          label="Pending Actions"
          value={orders.filter((o) => o.status !== 'picked_up').length}
          icon={Clock}
        />
      </div>

      {/* Orders */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
        </div>

        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((order) => (
              <div key={order.id}>
                {/* Order row */}
                <button
                  className="w-full px-6 py-4 text-left transition-colors hover:bg-muted/40"
                  onClick={() => toggleOrderDetails(order.id ?? '')}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Order #{order.orderId}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.receiverName} · {order.receiverPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">₹{order.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFirestoreDate(order.orderDate)}
                        </p>
                      </div>
                      <StatusPill status={order.status} size="sm" />
                      {order.isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {order.isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receiver Address</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{order.receiverAddress}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                        <div className="mt-1">
                          <StatusPill status={order.status} size="sm" />
                        </div>
                      </div>
                    </div>

                    {order.notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                        <p className="mt-1 text-sm text-foreground">{order.notes}</p>
                      </div>
                    )}

                    <div>
                      <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Items</p>
                      <div className="rounded-xl border border-border bg-card divide-y divide-border">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">
                              {item.name} × {item.quantity}
                            </span>
                            <span className="font-medium text-foreground">
                              ₹{(item.quantity * item.price).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 border-t border-border pt-4">
                      {order.status !== 'ready_for_pickup' && order.status !== 'picked_up' && (
                        <Button
                          size="sm"
                          onClick={() => setReadyProofTargetId(order.id ?? null)}
                          className="flex-1"
                        >
                          Mark Ready for Pickup
                        </Button>
                      )}
                      {order.readyForPickupProofUrl && (
                        <ProofImageBadge url={order.readyForPickupProofUrl} label="Ready Proof" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proof photo modal — required before "Mark Ready for Pickup" goes through */}
      <ProofPhotoModal
        open={Boolean(readyProofTargetId)}
        onOpenChange={(open) => { if (!open) setReadyProofTargetId(null) }}
        title="Mark Ready for Pickup"
        description="Attach a photo of the packed order as proof before marking it ready for the organisation to collect."
        confirmLabel="Confirm & Mark Ready"
        onConfirm={async (file) => {
          if (readyProofTargetId) await handleMarkReadyConfirm(readyProofTargetId, file)
        }}
      />
    </div>
  )
}
