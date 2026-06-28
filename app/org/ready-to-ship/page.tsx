"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Package, Truck, CheckCircle2, Loader2, MapPin, Store,
  Calendar, Hash, Gift, Mail, Phone,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  getOrgDonations,
  getOrgOrders,
  getUser,
  getVendor,
  updateDonationStatus,
  markOrderPickedUp,
  createNotification,
  type DonationDoc,
  type OrderDoc,
} from "@/lib/firestore"
import { Spinner } from "@/components/ui/spinner"
import { uploadProofImage } from "@/lib/storage"
import { ProofPhotoModal } from "@/components/shared/proof-photo-modal"
import { ProofImageBadge } from "@/components/shared/proof-image-badge"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(ts: any): string {
  if (!ts) return "—"
  const date =
    typeof ts.toDate === "function"
      ? ts.toDate()
      : typeof ts.seconds === "number"
      ? new Date(ts.seconds * 1000)
      : null
  if (!date || isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function getTimestampValue(ts: any): number {
  if (!ts) return 0
  if (typeof ts.toDate === "function") return ts.toDate().getTime()
  if (typeof ts.seconds === "number") return ts.seconds * 1000
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

/** Builds a display address string from whatever fields are actually available.
 *  Forward-compatible: if a full street `address` is present (now or added later),
 *  it's shown first; falls back to city/state when it isn't. */
function buildAddress(parts: { address?: string; city?: string; state?: string; zipCode?: string }): string {
  const segments = [parts.address, parts.city, parts.state, parts.zipCode].filter(Boolean)
  return segments.length > 0 ? segments.join(", ") : "—"
}

type ReadyItem =
  | {
      kind: "donation"
      id: string
      donation: DonationDoc
      donorName: string
      donorEmail: string
      donorPhone: string
      address: string
      sortTs: number
    }
  | {
      kind: "order"
      id: string
      order: OrderDoc
      address: string
      sortTs: number
    }

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReadyToShipPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [donationItems, setDonationItems] = useState<ReadyItem[]>([])
  const [orderItems, setOrderItems] = useState<ReadyItem[]>([])
  const [acting, setActing] = useState<string | null>(null)
  const [completeProofTargetId, setCompleteProofTargetId] = useState<string | null>(null)
  const [pickupProofTargetId, setPickupProofTargetId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return }
    setLoading(true)
    try {
      // ── Vendor-fulfilled items: paid orders the vendor has packed and
      //    marked ready for the org to collect (ready_for_pickup) ──
      // Loaded first so we can exclude any donation already represented
      // by one of these orders (see filter below).
      const orders = await getOrgOrders(user.uid)

      // ── Donor self-ship items: donations the org approved, where the
      //    donor has confirmed the item is packed and ready (ToBeConfirmed) ──
      // A donation also flips to "ToBeConfirmed" when the donor pays a
      // vendor via "Find a Vendor & Pay" (set by /api/payments/verify) —
      // that case is already represented by its linked `orders` doc above,
      // so it must NOT also show up here as a separate donor self-ship
      // card, or the same donation appears twice on this page.
      const donationIdsWithOrder = new Set(
        orders.map((o) => o.donationId).filter(Boolean) as string[]
      )
      const allToBeConfirmed = await getOrgDonations(user.uid, "ToBeConfirmed")
      const donations = allToBeConfirmed.filter((d) => !d.id || !donationIdsWithOrder.has(d.id))
      const uniqueDonorIds = [...new Set(donations.map((d) => d.donorId))]
      const donorEntries = await Promise.all(
        uniqueDonorIds.map(async (id) => {
          const donor = await getUser(id)
          return [id, donor] as const
        })
      )
      const donorMap = Object.fromEntries(donorEntries)

      const donationReadyItems: ReadyItem[] = donations
        .filter((d) => d.id)
        .map((d) => {
          const donor = donorMap[d.donorId]
          return {
            kind: "donation" as const,
            id: d.id!,
            donation: d,
            donorName: donor?.name ?? "Unknown Donor",
            donorEmail: donor?.email ?? "",
            donorPhone: d.donorPhone || donor?.phone || "",
            // city/state today; will pick up a full street address automatically
            // the moment one exists on the donor's profile.
            address: buildAddress({ address: (donor as any)?.address, city: donor?.city, state: donor?.state }),
            sortTs: getTimestampValue(d.updatedAt ?? d.createdAt),
          }
        })

      // ── Vendor-fulfilled items: paid orders the vendor has packed and
      //    marked ready for the org to collect (ready_for_pickup) ──
      // (`orders` was already fetched above to build donationIdsWithOrder)
      const readyOrders = orders.filter((o) => o.status === "ready_for_pickup" && o.id)
      const uniqueVendorIds = [...new Set(readyOrders.map((o) => o.vendorId).filter(Boolean))]
      const vendorEntries = await Promise.all(
        uniqueVendorIds.map(async (id) => {
          const vendor = await getVendor(id)
          return [id, vendor] as const
        })
      )
      const vendorMap = Object.fromEntries(vendorEntries)

      const orderReadyItems: ReadyItem[] = readyOrders.map((o) => {
        const vendor = vendorMap[o.vendorId]
        return {
          kind: "order" as const,
          id: o.id!,
          order: o,
          address: buildAddress({
            address: vendor?.address,
            city: vendor?.city,
            state: vendor?.state,
            zipCode: vendor?.zipCode,
          }),
          sortTs: getTimestampValue(o.updatedAt ?? o.orderDate),
        }
      })

      setDonationItems(donationReadyItems)
      setOrderItems(orderReadyItems)
    } catch (error) {
      console.error("Failed to load ready-to-ship items:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => { loadAll() }, [loadAll])

  const allItems = useMemo(
    () => [...donationItems, ...orderItems].sort((a, b) => b.sortTs - a.sortTs),
    [donationItems, orderItems]
  )

  const handleCompleteDonationConfirm = async (id: string, file: File) => {
    setActing(id)
    const item = donationItems.find((d) => d.id === id)
    try {
      const proofUrl = await uploadProofImage(id, "completed", file)
      await updateDonationStatus(id, "Completed", undefined, proofUrl)
      if (item?.kind === "donation") {
        await createNotification({
          userId: item.donation.donorId,
          title: "Donation Completed",
          body: "Your donation" + (item.donation.occasion ? ` for "${item.donation.occasion}"` : "") + " has been marked as completed. Thank you for your generosity!",
          type: "donation",
        })
      }
      setDonationItems((prev) => prev.filter((d) => d.id !== id))
    } finally {
      setActing(null)
    }
  }

  const handleMarkPickedUpConfirm = async (id: string, file: File) => {
    setActing(id)
    try {
      const proofUrl = await uploadProofImage(id, "picked_up", file)
      await markOrderPickedUp(id, proofUrl)
      setOrderItems((prev) => prev.filter((o) => o.id !== id))
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="mb-8 overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <h1 className="text-2xl text-white font-bold text-gray-900">Ready to Ship</h1>
        <p className="mt-1 text-white leading-relaxed text-gray-600">
          Items packed and waiting — from donors shipping their own items, and vendors who've prepared paid orders for collection.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-400">Total Ready</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{allItems.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-400">From Donors</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{donationItems.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-400">Vendor-Prepared</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{orderItems.length}</p>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-900">Nothing ready to ship right now</p>
          <p className="mt-1 text-sm text-gray-600">
            Donor self-ship items and vendor-prepared orders will appear here once they're packed and ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {allItems.map((item) =>
            item.kind === "donation" ? (
              <DonationReadyCard
                key={`d-${item.id}`}
                item={item}
                isActing={acting === item.id}
                onComplete={() => setCompleteProofTargetId(item.id)}
              />
            ) : (
              <OrderReadyCard
                key={`o-${item.id}`}
                item={item}
                isActing={acting === item.id}
                onPickedUp={() => setPickupProofTargetId(item.id)}
              />
            )
          )}
        </div>
      )}

      {/* Proof photo modal — required before "Complete" goes through */}
      <ProofPhotoModal
        open={Boolean(completeProofTargetId)}
        onOpenChange={(open) => { if (!open) setCompleteProofTargetId(null) }}
        title="Complete Donation"
        description="Attach a photo confirming the item has been received as proof before marking this donation complete."
        confirmLabel="Confirm & Complete"
        onConfirm={async (file) => {
          if (completeProofTargetId) await handleCompleteDonationConfirm(completeProofTargetId, file)
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
    </div>
  )
}

// ── Donor self-ship card ──────────────────────────────────────────────────────

function DonationReadyCard({
  item,
  isActing,
  onComplete,
}: {
  item: Extract<ReadyItem, { kind: "donation" }>
  isActing: boolean
  onComplete: () => void
}) {
  const d = item.donation
  const isMeal =
    Boolean(d.slotId) ||
    (!d.requirementId && !d.isOwnItem && (d.itemName === "meals" || Boolean(d.meals)))
  const isOwnItem =
    !isMeal &&
    (Boolean(d.isOwnItem) || (!d.requirementId && !d.slotId && Boolean(d.itemName) && d.itemName !== "meals"))
  const typeLabel = isOwnItem ? "Self Donation" : isMeal ? "Meal Sponsorship" : "Item Donation"

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{item.donorName}</h3>
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                {typeLabel}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="break-all">{item.donorEmail || "—"}</span>
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3 shrink-0" />
              {item.donorPhone || "—"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatTs(d.updatedAt ?? d.createdAt)}
              </span>
              {!isMeal && d.itemName && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  {d.itemName}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                <Hash className="h-3.5 w-3.5 text-gray-400" />
                {isMeal
                  ? `${d.meals ?? 0} meals`
                  : `Quantity: ${d.quantity ?? 0} ${d.unit || ""}`}
              </span>
            </div>

            <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
              <span>{item.address}</span>
            </div>

            {d.donateProofUrl && (
              <div className="mt-2">
                <ProofImageBadge url={d.donateProofUrl} label="Donor Proof" />
              </div>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          <button
            onClick={onComplete}
            disabled={isActing}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
          >
            {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Complete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vendor-fulfilled order card ───────────────────────────────────────────────

function OrderReadyCard({
  item,
  isActing,
  onPickedUp,
}: {
  item: Extract<ReadyItem, { kind: "order" }>
  isActing: boolean
  onPickedUp: () => void
}) {
  const o = item.order

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {o.donorName ? `${o.donorName}'s Order` : "Donor Order"}
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                Prepared by Vendor
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Order #{o.orderId}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Store className="h-3 w-3 shrink-0" />
              Vendor: {o.vendorName ?? "—"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatTs(o.updatedAt ?? o.orderDate)}
              </span>
              {Array.isArray(o.items) && o.items.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  {o.items.map((it) => `${it.name} (${it.quantity})`).join(", ")}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                ₹{o.amount.toFixed(2)}
              </span>
            </div>

            <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
              <span>{item.address}</span>
            </div>

            {o.readyForPickupProofUrl && (
              <div className="mt-2">
                <ProofImageBadge url={o.readyForPickupProofUrl} label="Vendor Proof" />
              </div>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          <button
            onClick={onPickedUp}
            disabled={isActing}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-60 sm:w-auto"
          >
            {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Mark Picked Up
          </button>
        </div>
      </div>
    </div>
  )
}