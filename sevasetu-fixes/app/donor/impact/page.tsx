"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  HandHeart, Users, TrendingUp, X, Tag,
  Package, Building2, MapPin, CheckCircle2,
  Utensils, Gift, Clock,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getDonorDonations, getOrganization, type DonationDoc, type OrganizationDoc } from "@/lib/firestore"
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
        {/* Header */}
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

        {/* Org list */}
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {orgDocs.map((o) => {
            const orgDonations = donations.filter(
              (d) => d.organizationId === o.uid && (d.status === "Completed" || d.status === "Approved")
            )
            const totalMeals = orgDonations.reduce((s, d) => s + (d.meals ?? 0), 0)
            const totalItems = orgDonations
              .filter((d) => d.requirementId)
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

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns a numeric ms timestamp from any Firestore-compatible date value,
 *  or 0 if none is available. Checks createdAt → submissionDate → updatedAt
 *  so the timeline always orders by the most meaningful "received" date. */
function donationTimestamp(d: DonationDoc): number {
  // 1. Firestore Timestamp (createdAt)
  const createdAt = (d.createdAt as any)
  if (createdAt) {
    if (typeof createdAt.toDate === "function") return createdAt.toDate().getTime()
    if (typeof createdAt.seconds === "number") return createdAt.seconds * 1000
  }
  // 2. String submission date (e.g. "2026-06-18")
  if ((d as any).submissionDate) {
    const t = new Date((d as any).submissionDate).getTime()
    if (!isNaN(t)) return t
  }
  // 3. donationDate string
  if ((d as any).donationDate) {
    const t = new Date((d as any).donationDate).getTime()
    if (!isNaN(t)) return t
  }
  // 4. updatedAt as last resort
  const updatedAt = (d.updatedAt as any)
  if (updatedAt) {
    if (typeof updatedAt.toDate === "function") return updatedAt.toDate().getTime()
    if (typeof updatedAt.seconds === "number") return updatedAt.seconds * 1000
  }
  return 0
}

// ── Impact Timeline ───────────────────────────────────────────────────────────

function ImpactTimeline({
  donations,
  orgNames,
}: {
  donations: DonationDoc[]   // Approved + Completed, pre-sorted newest-first
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
          const label = d.itemName
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
              {/* Icon: filled green for Completed, outlined amber for Approved */}
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
              {/* Status badge */}
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
  }, [user?.uid])

  const completed = useMemo(() => donations.filter((d) => d.status === "Completed"), [donations])

  // FIX: Timeline — Approved + Completed, sorted newest-first using the
  // full fallback chain (createdAt → submissionDate → donationDate → updatedAt)
  const timelineDonations = useMemo(
    () =>
      donations
        .filter((d) => d.status === "Approved" || d.status === "Completed")
        .sort((a, b) => donationTimestamp(b) - donationTimestamp(a)),
    [donations]
  )

  const stats = useMemo(() => {
    const totalDonations = completed.length
    const orgs = new Set(donations.map((d) => d.organizationId)).size
    const totalMeals = completed.reduce((s, d) => s + (d.meals ?? 0), 0)
    const totalItems = completed.filter((d) => d.requirementId).reduce((s, d) => s + (d.quantity ?? 0), 0)
    const mealsFunded = totalMeals + totalItems
    const reqFulfilled = completed.filter((d) => d.requirementId).length
    return { totalDonations, orgs, mealsFunded, reqFulfilled }
  }, [donations, completed])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">My Impact</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          See the real difference your contributions are making.
        </p>
      </header>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">

        {/* Total Donations → navigate to completed tab */}
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

        {/* Organizations → click opens all-orgs modal */}
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

        {/* Meals Funded */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">{stats.mealsFunded.toLocaleString("en-IN")}+</p>
          <p className="mt-1 text-sm font-medium text-foreground">Meals Funded</p>
          <p className="text-xs text-muted-foreground">Meals + items (completed)</p>
        </div>

        {/* Requirements Fulfilled */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </span>
          <p className="mt-4 text-3xl font-bold text-foreground">{stats.reqFulfilled}</p>
          <p className="mt-1 text-sm font-medium text-foreground">Requirements Fulfilled</p>
          <p className="text-xs text-muted-foreground">Item donations completed</p>
        </div>
      </div>

      {donations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground">No impact recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start donating to see your real-world impact here.</p>
        </div>
      )}

      {/* ── Impact Locations ── */}
      <LocationMap orgs={orgDocs} />

      {/* ── Impact Timeline — Approved + Completed, newest first ── */}
      <ImpactTimeline donations={timelineDonations} orgNames={orgNames} />

      {/* ── All Orgs Modal ── */}
      <AllOrgsModal
        open={orgsModalOpen}
        orgDocs={orgDocs}
        donations={donations}
        onClose={() => setOrgsModalOpen(false)}
      />
    </div>
  )
}
