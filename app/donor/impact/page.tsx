"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  HandHeart, Users, TrendingUp, X, Tag,
  Package, Building2, MapPin, CheckCircle2,
  Utensils, Gift, Clock, IndianRupee,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getDonorDonations, getDonorOrders, getOrganization, type DonationDoc, type OrderDoc, type OrganizationDoc } from "@/lib/firestore"
import { Spinner } from "@/components/ui/spinner"
import { formatFirestoreDate } from "@/lib/utils"
import { StatusBadge } from "@/components/donor/status-badge"

// ── All Orgs Modal ────────────────────────────────────────────────────────────

function AllOrgsModal({
  open,
  orgDocs,
  donations,
  onClose,
}: {
  open: boolean
  orgDocs: OrganizationDoc[]
  donations: DonationDoc[]
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Users className="h-5 w-5 text-green-600" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Organizations Supported</p>
              <p className="text-xs text-muted-foreground">{orgDocs.length} organization{orgDocs.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {orgDocs.map((o) => {
            const orgDonations = donations.filter(
              (d) => d.organizationId === o.uid && (d.status === "Completed" || d.status === "Approved")
            )
            const totalMeals = orgDonations.reduce((s, d) => s + (d.meals ?? 0), 0)
            const totalItems = orgDonations
              .filter((d) => d.requirementId && !d.isOwnItem)
              .reduce((s, d) => s + (d.quantity ?? 0), 0)

            return (
              <div key={o.uid} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    {(o.organizationName ?? o.name ?? "O")[0].toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{o.organizationName ?? o.name}</p>
                    {o.city && (
                      <p className="text-xs text-muted-foreground">
                        {o.city}{o.state ? `, ${o.state}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Gift className="h-3 w-3" />{orgDonations.length} donations
                  </span>
                  {totalMeals > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                      <Utensils className="h-3 w-3" />{totalMeals} meals
                    </span>
                  )}
                  {totalItems > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />{totalItems} items
                    </span>
                  )}
                  {o.category && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />{o.category}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Location Map (static pins) ────────────────────────────────────────────────

function LocationMap({ orgs }: { orgs: OrganizationDoc[] }) {
  if (orgs.length === 0) return null

  const markers = orgs
    .filter((o) => o.city)
    .map(
      (o) =>
        `markers=color:red%7Clabel:${encodeURIComponent((o.organizationName ?? o.name ?? "O")[0])}%7C${encodeURIComponent((o.city ?? "") + (o.state ? `,${o.state}` : "") + ",India")}`
    )
    .join("&")

  const center = orgs[0]?.city ? encodeURIComponent(`${orgs[0].city},India`) : "India"
  const src = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=5&size=600x300&${markers}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}`

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-1">Impact Locations</h2>
      <p className="text-sm text-muted-foreground mb-4">Places where your contributions reached.</p>

      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Impact map" className="w-full object-cover" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {orgs.filter((o) => o.city).map((o) => (
          <div key={o.uid} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {o.city}{o.state ? `, ${o.state}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{o.organizationName ?? o.name} · {o.category ?? "Donation"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Impact Timeline ───────────────────────────────────────────────────────────

function getTs(ts: any): number {
  if (!ts) return 0
  if (typeof ts.toDate === "function") return ts.toDate().getTime()
  if (typeof ts.seconds === "number") return ts.seconds * 1000
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

function ImpactTimeline({
  donations,
  orgNames,
}: {
  donations: DonationDoc[]
  orgNames: Record<string, string>
}) {
  if (donations.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-1">Impact Timeline</h2>
      <p className="text-sm text-muted-foreground mb-5">Your contribution history, most recent first.</p>
      <div className="relative flex flex-col gap-0">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
        {donations.map((d, i) => {
          const date = formatFirestoreDate(d.createdAt ?? d.updatedAt)
          const label = d.isOwnItem
            ? `Offered ${d.quantity ?? ""} ${d.unit ?? "units"} of ${d.itemName ?? "own item"}`
            : d.itemName
            ? `Donated ${d.quantity ?? ""} ${d.unit ?? "units"} of ${d.itemName}`
            : d.meals
            ? `Sponsored ${d.meals} meals`
            : d.occasion
            ? `${d.occasion} contribution`
            : "Made a contribution"
          const org = orgNames[d.organizationId]
          const isCompleted = d.status === "Completed"

          return (
            <div key={d.id ?? i} className="relative flex gap-4 pb-6 last:pb-0">
              <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                isCompleted
                  ? "bg-green-50 border-green-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
                {isCompleted
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <Clock className="h-4 w-4 text-amber-600" />
                }
              </div>
              <div className="flex-1 pt-1.5 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {org ? `${org} · ` : ""}{date}
                </p>
              </div>
              <div className="mt-1 shrink-0">
                <StatusBadge status={d.status} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ImpactPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [donations, setDonations] = useState<DonationDoc[]>([])
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [orgNames, setOrgNames] = useState<Record<string, string>>({})
  const [orgDocs, setOrgDocs] = useState<OrganizationDoc[]>([])
  const [orgsModalOpen, setOrgsModalOpen] = useState(false)

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return }
    getDonorDonations(user.uid)
      .then(async (data) => {
        setDonations(data)
        const uniqueOrgIds = [...new Set(data.map((d) => d.organizationId).filter(Boolean))]
        const docs = await Promise.all(uniqueOrgIds.map((id) => getOrganization(id)))
        const validDocs = docs.filter(Boolean) as OrganizationDoc[]
        setOrgDocs(validDocs)
        const nameMap: Record<string, string> = {}
        validDocs.forEach((o) => { nameMap[o.uid] = o.organizationName ?? o.name ?? "Unknown Org" })
        setOrgNames(nameMap)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Vendor orders carry the item/meal cost for donations fulfilled through
    // the "find vendor" flow (own-item donations, meal sponsorships without a
    // direct requirement purchase) — donations.amount stays 0 for those, so
    // the real cost has to be pulled from here and added in.
    getDonorOrders(user.uid).then(setOrders).catch(console.error)
  }, [user?.uid])

  // Map donationId -> order, so each donation can be matched to the vendor
  // order (if any) that carries its real item cost.
  const orderByDonationId = useMemo(() => {
    const map: Record<string, OrderDoc> = {}
    orders.forEach((o) => { if (o.donationId) map[o.donationId] = o })
    return map
  }, [orders])

  const completed = useMemo(() => donations.filter((d) => d.status === "Completed"), [donations])

  // Timeline: Approved + Completed, sorted newest first by createdAt
  const timelineDonations = useMemo(
    () =>
      donations
        .filter((d) => d.status === "Approved" || d.status === "Completed")
        .sort((a, b) => getTs(b.createdAt) - getTs(a.createdAt)),
    [donations]
  )

  const stats = useMemo(() => {
    const totalDonations = completed.length
    const orgs = new Set(donations.map((d) => d.organizationId)).size
    const totalMeals = completed.reduce((s, d) => s + (d.meals ?? 0), 0)
    // Only count items from org-posted requirements (not own-item donations)
    const totalItems = completed
      .filter((d) => d.requirementId && !d.isOwnItem)
      .reduce((s, d) => s + (d.quantity ?? 0), 0)
    const mealsFunded = totalMeals + totalItems
    const reqFulfilled = completed.filter((d) => d.requirementId && !d.isOwnItem).length
    // Total amount donated across every donation type (meals, items, own-items, etc.) — Completed only.
    // Most donations carry their paid amount directly on donations.amount (e.g. requirement
    // checkout). Donations fulfilled via the "find vendor" flow record their cost on the
    // matching orders.amount instead (donations.amount is 0 in that case) — so fall back to
    // the linked order's amount whenever the donation itself has none, to avoid double-counting.
    const totalAmount = completed.reduce((s, d) => {
      const donationAmount = d.amount ?? 0
      const orderAmount = d.id ? orderByDonationId[d.id]?.amount ?? 0 : 0
      return s + (donationAmount > 0 ? donationAmount : orderAmount)
    }, 0)
    return { totalDonations, orgs, mealsFunded, reqFulfilled, totalAmount }
  }, [donations, completed, orderByDonationId])

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
        <h1 className=" text-white text-2xl font-bold text-foreground md:text-3xl">My Impact</h1>
        <p className="mt-2 text-white text-sm text-muted-foreground">
          See the real difference your contributions are making.
        </p>
      </header></div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">

        <button
          onClick={() => router.push("/donor/donations?tab=Completed")}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm text-left transition-shadow hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">₹{stats.totalAmount.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-sm font-medium text-foreground">Total Amount Donated</p>
          <p className="text-xs text-muted-foreground">Meals, items &amp; more · Completed only</p>
        </button>

        <button
          onClick={() => router.push("/donor/donations?tab=Completed")}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm text-left transition-shadow hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50">
            <HandHeart className="h-5 w-5 text-rose-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">{stats.totalDonations}</p>
          <p className="mt-1 text-sm font-medium text-foreground">Total Donations</p>
          <p className="text-xs text-muted-foreground">Completed only</p>
        </button>

        <button
          onClick={() => setOrgsModalOpen(true)}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm text-left transition-shadow hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
            <Users className="h-5 w-5 text-green-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">{stats.orgs}</p>
          <p className="mt-1 text-sm font-medium text-foreground">Organizations Supported</p>
          <p className="text-xs text-muted-foreground">Tap to view all</p>
        </button>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">{stats.mealsFunded.toLocaleString("en-IN")}+</p>
          <p className="mt-1 text-sm font-medium text-foreground">Meals Funded</p>
          <p className="text-xs text-muted-foreground">Meals + requirement items</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">{stats.reqFulfilled}</p>
          <p className="mt-1 text-sm font-medium text-foreground">Requirements Fulfilled</p>
          <p className="text-xs text-muted-foreground">Org-posted requirements only</p>
        </div>
      </div>

      {donations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground">No impact recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start donating to see your real-world impact here.</p>
        </div>
      )}

      <LocationMap orgs={orgDocs} />

      <ImpactTimeline donations={timelineDonations} orgNames={orgNames} />

      <AllOrgsModal
        open={orgsModalOpen}
        orgDocs={orgDocs}
        donations={donations}
        onClose={() => setOrgsModalOpen(false)}
      />
    </div>
  )
}