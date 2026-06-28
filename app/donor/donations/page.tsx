"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { getDonorDonations, getOrganization, getDonorOrders, updateDonationStatus, type DonationDoc, type OrderDoc } from "@/lib/firestore"
import { uploadProofImage } from "@/lib/storage"
import { ProofPhotoModal } from "@/components/shared/proof-photo-modal"
import { ProofImageBadge } from "@/components/shared/proof-image-badge"
import { useAuth } from "@/lib/auth-context"
import { StatusBadge } from "@/components/donor/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { HandHeart, Building2, X, Calendar, Tag, Hash, MessageSquare, Package, Gift, CheckCircle2, Clock, ThumbsUp, ShoppingCart, Store, IndianRupee, Utensils } from "lucide-react"
import { formatFirestoreDate, tsToDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

type StatusFilter = "All" | "Completed" | "Approved" | "ToBeConfirmed" | "Pending" | "Rejected"

// ── Helper: resolve donation type ─────────────────────────────────────────────
// Falls back to itemName check for older records that predate isOwnItem flag
function resolveDonationType(donation: DonationDoc): {
  isOwnItem: boolean
  isItem: boolean
  isMeal: boolean
} {
  // Meal sponsorships: have a slotId, or itemName="meals", or a meals count with no requirementId
  const isMeal =
    Boolean(donation.slotId) ||
    (!donation.requirementId && !donation.isOwnItem && (donation.itemName === "meals" || Boolean(donation.meals)))
  const isOwnItem =
    !isMeal &&
    (Boolean(donation.isOwnItem) ||
      (!donation.requirementId && !donation.slotId && Boolean(donation.itemName) && donation.itemName !== "meals"))
  const isItem = !isOwnItem && !isMeal && Boolean(donation.requirementId)
  return { isOwnItem, isItem, isMeal }
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DonationDetailModal({
  donation,
  orgName,
  order,
  onClose,
}: {
  donation: DonationDoc | null
  orgName: string
  order?: OrderDoc | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!donation) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [donation, onClose])

  if (!donation) return null

  const { isOwnItem, isItem, isMeal } = resolveDonationType(donation)
  const displayDate = donation.donationDate
    ? new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : formatFirestoreDate(donation.createdAt ?? donation.updatedAt)

  const typeLabel = isOwnItem ? "Self Donation" : isItem ? "Item Donation" : donation.mealType ? `${donation.mealType} Sponsorship` : "Meal Sponsorship"

  const paymentDateTime = order
    ? (() => {
        const d = tsToDate(order.orderDate ?? order.updatedAt)
        return d
          ? d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
          : "—"
      })()
    : null

  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    { icon: <Building2 className="h-4 w-4" />, label: "Organization", value: orgName || "—" },
    {
      icon: <Tag className="h-4 w-4" />,
      label: "Type",
      value: (
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          isOwnItem
            ? "bg-purple-100 text-purple-700"
            : isItem
            ? "bg-blue-100 text-blue-700"
            : "bg-amber-100 text-amber-700"
        )}>
          {typeLabel}
        </span>
      ),
    },
    ...(isItem || isOwnItem
      ? [
          { icon: <Package className="h-4 w-4" />, label: "Item", value: donation.itemName ?? "—" },
          { icon: <Hash className="h-4 w-4" />, label: "Quantity", value: donation.originalQuantity != null
            ? `${donation.quantity ?? 0} ${donation.unit ?? "units"} (reduced from ${donation.originalQuantity} ${donation.unit ?? "units"} requested)`
            : `${donation.quantity ?? 0} ${donation.unit ?? "units"}` },
        ]
      : [
          ...(donation.mealType ? [{ icon: <Utensils className="h-4 w-4" />, label: "Meal", value: donation.mealType }] : []),
          { icon: <Hash className="h-4 w-4" />, label: "Meals", value: donation.meals ? `${donation.meals} meals` : "—" },
        ]),
    ...(donation.occasion ? [{ icon: <Tag className="h-4 w-4" />, label: "Occasion", value: donation.occasion }] : []),
    { icon: <Calendar className="h-4 w-4" />, label: "Date", value: displayDate },
    ...(donation.slotId && donation.donationDate
      ? [{
          icon: <Calendar className="h-4 w-4" />,
          label: "Slot Date",
          value: (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {new Date(donation.donationDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {donation.mealType ? ` · ${donation.mealType}` : ""}
            </span>
          ),
        }]
      : []),
    // Payment/order details — only available once the donation has an associated vendor order
    ...(order
      ? [
          { icon: <Store className="h-4 w-4" />, label: "Vendor", value: order.vendorName ?? "—" },
          { icon: <IndianRupee className="h-4 w-4" />, label: "Amount Paid", value: `₹${order.amount.toFixed(2)}` },
          { icon: <Clock className="h-4 w-4" />, label: "Paid On", value: paymentDateTime ?? "—" },
        ]
      : []),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isOwnItem ? "bg-purple-50 text-purple-600" : "bg-primary/10 text-primary"
            )}>
              {isOwnItem ? <Gift className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </span>
            <div>
              <p className="font-semibold text-foreground">
                {donation.itemName ? `${donation.itemName} Donation` : donation.occasion || "Sponsorship"}
              </p>
              <p className="text-xs text-muted-foreground">{orgName || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={donation.status} />
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
            {rows.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Message */}
          {donation.message && (
            <div className="mt-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Note
              </p>
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground leading-relaxed">
                {donation.message}
              </p>
            </div>
          )}

          {/* Proof photos — shown once available for whichever steps have happened */}
          {(donation.donateProofUrl || donation.completedProofUrl || order?.readyForPickupProofUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <ProofImageBadge url={donation.donateProofUrl} label="Donate Proof" />
              <ProofImageBadge url={order?.readyForPickupProofUrl} label="Vendor Ready Proof" />
              <ProofImageBadge url={donation.completedProofUrl} label="Completed Proof" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  valueColor,
  active,
  clickable,
  subtitle,
  onClick,
}: {
  label: string
  value: number
  icon: React.ElementType
  valueColor: string
  active: boolean
  clickable: boolean
  subtitle?: string
  onClick: () => void
}) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm text-left transition-all duration-150 w-full",
        clickable
          ? active
            ? "border-primary ring-2 ring-primary/20 cursor-pointer"
            : "border-border hover:border-primary/40 hover:shadow-md cursor-pointer"
          : "border-border cursor-default opacity-90"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", active && clickable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold", valueColor)}>{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {active && clickable && (
        <p className="mt-1 text-xs font-medium text-primary">Showing these ↓</p>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DonationsPage() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<DonationDoc[]>([])
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [orgNames, setOrgNames] = useState<Record<string, string>>({})
  const [selectedDonation, setSelectedDonation] = useState<DonationDoc | null>(null)
  const [orgFilter, setOrgFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Completed")
  const [donateLoadingId, setDonateLoadingId] = useState<string | null>(null)
  const [donateProofTargetId, setDonateProofTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return }
    getDonorDonations(user.uid)
      .then(async (data) => {
        setDonations(data)
        const uniqueOrgIds = [...new Set(data.map((d) => d.organizationId).filter(Boolean))]
        const entries = await Promise.all(
          uniqueOrgIds.map(async (id) => {
            const org = await getOrganization(id)
            return [id, org?.organizationName ?? org?.name ?? "Unknown Org"] as const
          })
        )
        setOrgNames(Object.fromEntries(entries))
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Fetch the donor's vendor orders too, so completed donations can show
    // which vendor the money was paid to, the amount, and when it was paid.
    getDonorOrders(user.uid)
      .then(setOrders)
      .catch(console.error)
  }, [user?.uid])

  // Map donationId -> order, for quick lookup when opening the detail modal,
  // and to gate the "Donate" button (see action buttons below). Failed/cancelled
  // orders are excluded so a donor whose vendor payment didn't go through can
  // still retry "Find a Vendor & Pay" or fall back to "Donate" instead of being
  // permanently stuck.
  const orderByDonationId = useMemo(() => {
    const map: Record<string, OrderDoc> = {}
    orders.forEach((o) => {
      if (o.donationId && o.status !== "failed") map[o.donationId] = o
    })
    return map
  }, [orders])

  // Donor confirms an approved donation is ready to ship — moves it to
  // ToBeConfirmed ("Awaiting Pickup"), where it shows up in the org's queue
  // and the donor's "To Be Completed" tab, until the org marks it Completed.
  // A proof photo is mandatory: clicking "Donate" opens a modal, and this
  // only runs once the donor has attached a photo and confirmed in it.
  const handleDonateConfirm = async (donationId: string, file: File) => {
    setDonateLoadingId(donationId)
    try {
      const proofUrl = await uploadProofImage(donationId, "donate", file)
      await updateDonationStatus(donationId, "ToBeConfirmed", undefined, proofUrl)
      setDonations((prev) =>
        prev.map((d) => (d.id === donationId ? { ...d, status: "ToBeConfirmed" as const, donateProofUrl: proofUrl } : d))
      )
    } finally {
      setDonateLoadingId(null)
    }
  }

  const counts = useMemo(() => {
    const completed = donations.filter((d) => d.status === "Completed").length
    const approvedOnly = donations.filter((d) => d.status === "Approved").length
    const toBeConfirmed = donations.filter((d) => d.status === "ToBeConfirmed").length
    const toBeCompleted = toBeConfirmed
    return {
      all: donations.filter((d) => d.status !== "Pending" && d.status !== "Rejected").length,
      completed,
      toBeConfirmed,
      approvedOnly,
      toBeCompleted,
      pending: donations.filter((d) => d.status === "Pending").length,
      rejected: donations.filter((d) => d.status === "Rejected").length,
    }
  }, [donations])

  const orgOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { id: string; name: string }[] = []
    donations.forEach((d) => {
      if (d.organizationId && !seen.has(d.organizationId)) {
        seen.add(d.organizationId)
        opts.push({ id: d.organizationId, name: orgNames[d.organizationId] ?? "…" })
      }
    })
    return opts
  }, [donations, orgNames])

  const filtered = useMemo(() => {
    let result =
      statusFilter === "All"
        // "All" shows only org-actioned donations — excludes Pending and Rejected
        ? donations.filter((d) => d.status !== "Pending" && d.status !== "Rejected")
        : statusFilter === "Approved"
        ? donations.filter((d) => d.status === "Approved")
        : statusFilter === "ToBeConfirmed"
        ? donations.filter((d) => d.status === "ToBeConfirmed")
        : donations.filter((d) => d.status === statusFilter)
    if (orgFilter !== "All") result = result.filter((d) => d.organizationId === orgFilter)
    return result
  }, [donations, statusFilter, orgFilter])

  const statCards: {
    label: string
    key: StatusFilter
    value: number
    icon: React.ElementType
    valueColor: string
    clickable: boolean
    subtitle?: string
  }[] = [
    { label: "Completed", key: "Completed", value: counts.completed, icon: CheckCircle2, valueColor: "text-green-600", clickable: true },
    { label: "Approved", key: "Approved", value: counts.approvedOnly, icon: ThumbsUp, valueColor: "text-blue-600", clickable: true },
    { label: "To Be Completed", key: "ToBeConfirmed", value: counts.toBeCompleted, icon: Clock, valueColor: "text-amber-600", clickable: true, subtitle: "Payment done, pending pickup" },
    { label: "All Active", key: "All", value: counts.all, icon: Gift, valueColor: "text-foreground", clickable: true },
  ]

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
      <header>
        <h1 className="text-2xl text-white font-bold text-foreground md:text-3xl">My Donations</h1>
        <p className="mt-2 text-sm text-white text-muted-foreground">
          A record of all your contributions.
        </p>
      </header>
      </div>

      {/* ── Clickable stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card, i) => (
          <StatCard
            key={card.label + i}
            label={card.label}
            value={card.value}
            icon={card.icon}
            valueColor={card.valueColor}
            active={statusFilter === card.key && card.clickable}
            clickable={card.clickable}
            subtitle={card.subtitle}
            onClick={() => card.clickable && setStatusFilter(card.key)}
          />
        ))}
      </div>

      {donations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <HandHeart className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground">No donations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse organizations and make your first contribution.
          </p>
        </div>
      ) : (
        <>
          {/* Org filter pills */}
          {orgOptions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOrgFilter("All")}
                className={cn(
                  "rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors",
                  orgFilter === "All"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                All
                <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-xs", orgFilter === "All" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                  {filtered.length}
                </span>
              </button>
              {orgOptions.map((org) => {
                const count = filtered.filter((d) => d.organizationId === org.id).length
                return (
                  <button
                    key={org.id}
                    onClick={() => setOrgFilter(org.id)}
                    className={cn(
                      "rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors",
                      orgFilter === org.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {org.name}
                    <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-xs", orgFilter === org.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Current filter label */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              {statusFilter === "All"
                ? "active donations"
                : statusFilter === "Approved"
                ? "approved donations"
                : statusFilter === "ToBeConfirmed"
                ? "donations awaiting pickup"
                : `${statusFilter.toLowerCase()} donations`}
              {orgFilter !== "All" && ` · ${orgNames[orgFilter] ?? ""}`}
            </p>
            {statusFilter !== "Completed" && (
              <button
                onClick={() => setStatusFilter("Completed")}
                className="text-xs text-primary underline underline-offset-2 hover:no-underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                No {statusFilter === "All" ? "" : statusFilter.toLowerCase()} donations
                {orgFilter !== "All" ? ` for ${orgNames[orgFilter] ?? "this organization"}` : ""}.
              </div>
            ) : (
              filtered.map((donation) => {
                const { isOwnItem, isItem, isMeal } = resolveDonationType(donation)
                return (
                  <div
                    key={donation.id}
                    onClick={() => setSelectedDonation(donation)}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          isOwnItem ? "bg-purple-50 text-purple-600" : "bg-primary/10 text-primary"
                        )}>
                          {isOwnItem ? <Gift className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">
                              {donation.itemName
                                ? `${donation.itemName} Donation`
                                : donation.occasion || "Sponsorship"}
                            </p>
                            {/* Type badge inline */}
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              isOwnItem
                                ? "bg-purple-100 text-purple-700"
                                : isItem
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {isOwnItem ? "Self Donation" : isItem ? "Item Donation" : donation.mealType ? `${donation.mealType} Sponsorship` : "Meal Sponsorship"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span>
                              {donation.donationDate
                                ? new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                : formatFirestoreDate(donation.createdAt ?? donation.updatedAt)}
                            </span>
                            {donation.slotId && donation.donationDate && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <Calendar className="h-3 w-3" />
                                Slot: {new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {(isItem || isOwnItem)
                              ? <>
                                  <span className="font-medium text-foreground">{donation.quantity ?? 0} {donation.unit || "units"}</span>
                                  {donation.originalQuantity != null && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                      Trimmed · requested {donation.originalQuantity} {donation.unit || "units"}
                                    </span>
                                  )}
                                </>
                              : <span className="font-medium text-foreground">
                                  {donation.mealType ? `${donation.mealType} · ` : ""}{donation.meals ? `${donation.meals} meals` : "Meal Sponsorship"}
                                </span>
                            }
                            {donation.occasion && !donation.itemName && (
                              <span>{donation.occasion}</span>
                            )}
                            {orgNames[donation.organizationId] && (
                              <span className="text-xs text-muted-foreground/70">· {orgNames[donation.organizationId]}</span>
                            )}
                          </div>
                          {donation.message && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {donation.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={donation.status} />
                    </div>

                    {/* Action buttons for Approved donations:
                        - "Find a Vendor & Pay": shown on every Approved record (own-item included)
                        - "Donate": shown ONLY when no vendor order exists yet for this donation.
                          Once the donor has started "Find a Vendor & Pay" (an `orders` doc with
                          this donationId exists), "Donate" must disappear — it unconditionally
                          flips status to ToBeConfirmed, which would let a vendor-paid item jump
                          straight to the org's "Complete" (self-ship) card before the vendor has
                          even marked it ready, bypassing the whole vendor preparation/pickup flow.
                        Wrapper stacks on narrow screens and sits side-by-side on wider ones. */}
                    {donation.status === "Approved" && donation.id && !orderByDonationId[donation.id] && (
                      <div className="mt-4 border-t border-border pt-4">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            asChild
                            size="sm"
                            className="w-full gap-2 bg-vendor-orange hover:bg-vendor-orange/90 text-white sm:flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/donor/find-vendor/${donation.id}`}>
                              <ShoppingCart className="h-4 w-4" />
                              Find a Vendor & Pay
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground sm:flex-1"
                            disabled={donateLoadingId === donation.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDonateProofTargetId(donation.id ?? null)
                            }}
                          >
                            <HandHeart className="h-4 w-4" />
                            {donateLoadingId === donation.id ? "Marking…" : "Donate"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Detail modal */}
      <DonationDetailModal
        donation={selectedDonation}
        orgName={selectedDonation ? (orgNames[selectedDonation.organizationId] ?? "—") : ""}
        order={selectedDonation?.id ? orderByDonationId[selectedDonation.id] : null}
        onClose={() => setSelectedDonation(null)}
      />

      {/* Proof photo modal — required before "Donate" goes through */}
      <ProofPhotoModal
        open={Boolean(donateProofTargetId)}
        onOpenChange={(open) => { if (!open) setDonateProofTargetId(null) }}
        title="Confirm Donation"
        description="Attach a photo of the packed item as proof before marking this donation ready to ship."
        confirmLabel="Confirm & Donate"
        onConfirm={async (file) => {
          if (donateProofTargetId) await handleDonateConfirm(donateProofTargetId, file)
        }}
      />
    </div>
  )
}