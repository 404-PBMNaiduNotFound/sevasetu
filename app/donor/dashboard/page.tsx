"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  HandHeart, CheckCircle2, Building2, Sparkles, ArrowRight,
  MapPin, Package, Calendar, ChevronRight, IndianRupee,
} from "lucide-react"
import { StatusBadge } from "@/components/donor/status-badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  getDonorDonations,
  getDonorOrders,
  getOrganizations,
  getRequirements,
  getSlots,
  type DonationDoc,
  type OrderDoc,
  type OrganizationDoc,
  type RequirementDoc,
  type SlotDoc,
} from "@/lib/firestore"
import { Spinner } from "@/components/ui/spinner"
import { CompleteProfilePopup } from "@/components/donor/complete-profile-popup"

/** Returns true if the donation is slot/meal-based */
function isMealDonation(d: DonationDoc): boolean {
  return (
    Boolean(d.slotId) ||
    d.itemName === "meals" ||
    (!d.itemName && !d.quantity && d.meals != null)
  )
}

function getContribution(d: DonationDoc): string | null {
  if (isMealDonation(d)) {
    const count = d.meals ?? 0
    return count > 0 ? `${count} meals` : null  // null = caller hides this row
  }
  if (d.itemName) return `${d.itemName} — ${d.quantity ?? 0} ${d.unit ?? ""}`
  if (d.quantity) return `${d.quantity} ${d.unit ?? ""}`.trim()
  return "Sponsorship"
}

/** Only show donations that have a real visible contribution */
function hasRealContribution(d: DonationDoc): boolean {
  if (isMealDonation(d)) return (d.meals ?? 0) > 0
  if (d.itemName && d.itemName !== "meals") return true
  if (d.quantity && d.quantity > 0)         return true
  return false
}

function getDisplayDate(d: DonationDoc): string {
  if (d.donationDate) {
    const dt = new Date(d.donationDate)
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }
  const ts = d.createdAt as any
  if (!ts) return "—"
  const date = typeof ts.toDate === "function" ? ts.toDate() : typeof ts.seconds === "number" ? new Date(ts.seconds * 1000) : null
  if (!date || isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function tsToDate(ts: any): Date | null {
  if (!ts) return null
  if (typeof ts.toDate === "function") return ts.toDate()
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000)
  return null
}

type RecommendedTier = "high" | "medium" | "low"

type RecommendedItem =
  | { type: "requirement"; req: RequirementDoc; org: OrganizationDoc; tier: RecommendedTier; tierLabel: string }
  | { type: "slot"; slot: SlotDoc; org: OrganizationDoc; tier: RecommendedTier; tierLabel: string }

// Compute local date strings once at module scope to avoid repetition.
// Uses local date parts (not toISOString / UTC) so IST/+5:30 doesn't shift the date.
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function DashboardPage() {
  const { user, userDoc } = useAuth()
  const [donations, setDonations]         = useState<DonationDoc[]>([])
  const [orders, setOrders]               = useState<OrderDoc[]>([])
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([])
  const [requirements, setRequirements]   = useState<RequirementDoc[]>([])
  const [slots, setSlots]                 = useState<SlotDoc[]>([])
  const [loading, setLoading]             = useState(true)
  const [orgFilter, setOrgFilter]         = useState<string>("All")

  // Date strings computed once per render for slot card labels
  const todayDateStr   = localDateStr(new Date())
  const tomorrowDateStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d) })()

  useEffect(() => {
    if (!user?.uid) return
    async function load() {
      setLoading(true)
      try {
        const tomorrow = (() => {
          const t = new Date()
          t.setDate(t.getDate() + 1)
          return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`
        })()
        console.log("[Dashboard] fetching slots with dateFrom:", tomorrow)

        const [donationsData, orgsData, reqsData, slotsData, ordersData] = await Promise.all([
          getDonorDonations(user!.uid),
          getOrganizations(),
          getRequirements(),
          getSlots({ dateFrom: tomorrow }),
          getDonorOrders(user!.uid),
        ])
        console.log("[Dashboard] slots received:", slotsData.map(s => ({ id: s.id, date: s.date, status: s.status })))
        setDonations(donationsData)
        setOrganizations(orgsData)
        setRequirements(reqsData)
        setSlots(slotsData)
        setOrders(ordersData)
      } catch (e) {
        console.error("Dashboard load failed:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  const orgMap = useMemo(() => {
    const m = new Map<string, OrganizationDoc>()
    organizations.forEach((o: OrganizationDoc) => m.set(o.uid || o.orgId || "", o))
    return m
  }, [organizations])

  // Only completed donations
  const completedDonations = useMemo(
    () => donations.filter((d: DonationDoc) => d.status === "Completed"),
    [donations]
  )

  // Map donationId -> order, so each donation can be matched to the vendor
  // order (if any) that carries its real item cost — same as the Impact page.
  const orderByDonationId = useMemo(() => {
    const map: Record<string, OrderDoc> = {}
    orders.forEach((o: OrderDoc) => { if (o.donationId) map[o.donationId] = o })
    return map
  }, [orders])

  // Total amount donated across every donation type (meals, items, own-items, etc.) —
  // Completed only. Most donations carry their paid amount directly on donations.amount
  // (e.g. requirement checkout). Donations fulfilled via the "find vendor" flow record
  // their cost on the matching orders.amount instead (donations.amount is 0 in that case)
  // — so fall back to the linked order's amount whenever the donation itself has none.
  const totalAmountDonated = useMemo(() => {
    return completedDonations.reduce((s: number, d: DonationDoc) => {
      const donationAmount = d.amount ?? 0
      const orderAmount = d.id ? orderByDonationId[d.id]?.amount ?? 0 : 0
      return s + (donationAmount > 0 ? donationAmount : orderAmount)
    }, 0)
  }, [completedDonations, orderByDonationId])

  // Filtered completed donations by org tab
  // Only show donations that have a real contribution (meals > 0, or have quantity/itemName)
  const displayDonations = useMemo(
    () => completedDonations.filter(hasRealContribution),
    [completedDonations]
  )

  // Unique orgs that have completed donations (using displayDonations so tabs match visible list)
  const completedOrgs = useMemo(() => {
    const orgIds = [...new Set(displayDonations.map((d: DonationDoc) => d.organizationId))] as string[]
    return orgIds.map((id: string) => {
      const org = orgMap.get(id)
      const name = org?.organizationName || org?.name || id.slice(0, 10) + "…"
      return { id, name, count: displayDonations.filter((d: DonationDoc) => d.organizationId === id).length }
    })
  }, [displayDonations, orgMap])

  const filteredDonations = useMemo(() => {
    if (orgFilter === "All") return displayDonations
    return displayDonations.filter((d: DonationDoc) => d.organizationId === orgFilter)
  }, [displayDonations, orgFilter])

  // Recommendations: tiered by priority, 2-day slot window, and location
  const recommended = useMemo((): RecommendedItem[] => {
    const userCity  = (userDoc as any)?.city?.trim().toLowerCase() ?? ""
    const userState = (userDoc as any)?.state?.trim().toLowerCase() ?? ""

    // Score 0 = same city (best), 1 = same state, 2 = no match
    function locationScore(org: OrganizationDoc): number {
      const orgCity  = org.city?.trim().toLowerCase() ?? ""
      const orgState = org.state?.trim().toLowerCase() ?? ""
      if (userCity  && orgCity  === userCity)  return 0
      if (userState && orgState === userState) return 1
      return 2
    }

    function isNearby(org: OrganizationDoc): boolean {
      return locationScore(org) <= 1
    }

    const now = new Date()
    // Build date strings from LOCAL date parts to avoid UTC offset shifting the date
    // (toISOString() returns UTC, which in IST/+5:30 would give yesterday's date)
    const todayStr = localDateStr(now)

    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(now.getDate() + 1)
    const tomorrowStr = localDateStr(tomorrowDate)

    console.log("[Recommended] todayStr:", todayStr, "tomorrowStr:", tomorrowStr)
    console.log("[Recommended] all slots in state:", slots.map(s => s.date))

    // ── TIER 1: HIGH priority requirements (top 2, location-sorted) ──────────
    type ReqEntry = { req: RequirementDoc; org: OrganizationDoc; locScore: number }
    type SlotEntry = { slot: SlotDoc; org: OrganizationDoc; locScore: number; isNear: boolean }

    const highReqs = requirements
      .filter((r: RequirementDoc) =>
        r.status === "Open" &&
        (r.fulfilledQuantity || 0) < (r.totalQuantity || 1) &&
        r.priority === "High"
      )
      .map((r: RequirementDoc): ReqEntry | null => {
        const org = orgMap.get(r.organizationId)
        if (!org) return null
        return { req: r, org, locScore: locationScore(org) }
      })
      .filter((x: ReqEntry | null): x is ReqEntry => x !== null)
      .sort((a: ReqEntry, b: ReqEntry) => a.locScore - b.locScore)
      .slice(0, 2)
      .map(({ req, org }: ReqEntry): RecommendedItem => ({
        type: "requirement",
        req,
        org,
        tier: "high",
        tierLabel: "🔴 Urgent Need",
      }))

    // ── TIER 2: MEDIUM – advance-bookable slots (date >= minBookableDate = tomorrow+) ──
    // Mirrors the sponsor form: slot.date must be >= getMinBookableDate() (today + SPONSORSHIP_LEAD_TIME_DAYS)
    // No upper-bound cap — show all future bookable slots, sorted nearest first.
    const upcomingSlots = slots
      .filter((s: SlotDoc) =>
        (s.status === "Available" || s.status === "Partially Filled") &&
        s.date > todayStr
      )
      .map((s: SlotDoc): SlotEntry | null => {
        const org = orgMap.get(s.organizationId)
        if (!org) return null
        return { slot: s, org, locScore: locationScore(org), isNear: isNearby(org) }
      })
      .filter((x: SlotEntry | null): x is SlotEntry => x !== null)
      .sort((a: SlotEntry, b: SlotEntry) => {
        // Nearby first, then by date ascending (today before tomorrow)
        if (a.locScore !== b.locScore) return a.locScore - b.locScore
        return a.slot.date.localeCompare(b.slot.date)
      })
      .slice(0, 2)
      .map(({ slot, org, isNear }: SlotEntry): RecommendedItem => {
        const isTomorrow = slot.date === tomorrowStr
        const tierLabel = isTomorrow
          ? (isNear ? "📍 Tomorrow · Nearby" : "📅 Tomorrow")
          : (isNear ? "📍 Upcoming · Nearby" : "📅 Upcoming")
        return { type: "slot", slot, org, tier: "medium", tierLabel }
      })

    // ── TIER 3: LOW – remaining Medium priority requirements, location-sorted ──
    const highReqIds = new Set(highReqs.map((i: RecommendedItem) => i.type === "requirement" ? i.req.id : ""))
    const mediumReqs = requirements
      .filter((r: RequirementDoc) =>
        r.status === "Open" &&
        (r.fulfilledQuantity || 0) < (r.totalQuantity || 1) &&
        r.priority === "Medium" &&
        !highReqIds.has(r.id)
      )
      .map((r: RequirementDoc): ReqEntry | null => {
        const org = orgMap.get(r.organizationId)
        if (!org) return null
        return { req: r, org, locScore: locationScore(org) }
      })
      .filter((x: ReqEntry | null): x is ReqEntry => x !== null)
      .sort((a: ReqEntry, b: ReqEntry) => a.locScore - b.locScore)
      .slice(0, 2)
      .map(({ req, org, locScore }: ReqEntry): RecommendedItem => ({
        type: "requirement",
        req,
        org,
        tier: "low",
        tierLabel: locScore === 0 ? "🟡 Medium · Your City" : locScore === 1 ? "🟡 Medium · Your State" : "🟡 Medium Priority",
      }))

    // Merge tiers; cap total at 4 visible cards
    const merged = [...highReqs, ...upcomingSlots, ...mediumReqs]

    // De-duplicate (same id shouldn't appear twice)
    const seen = new Set<string>()
    return merged.filter((item: RecommendedItem) => {
      const key = item.type === "requirement" ? `req-${item.req.id}` : `slot-${item.slot.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 4)
  }, [requirements, slots, orgMap, userDoc])

  // Show the one-time profile completion popup for brand-new donors.
  // userDoc is loaded by AuthContext; we wait until it's available and only
  // show the popup when profilePromptSeen is explicitly false/undefined.
  const showProfilePopup =
    !loading &&
    !!user?.uid &&
    !!userDoc &&
    !(userDoc as any).profilePromptSeen

  if (loading) {
    return <div className="py-12 flex justify-center"><Spinner className="size-8" /></div>
  }

  return (
    <>
      {/* One-time profile completion popup */}
      {showProfilePopup && <CompleteProfilePopup uid={user!.uid} />}

      <div className="flex flex-col gap-8" >
        {/* Welcome */}
        <section className="overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground md:p-8">
          <h1 className="text-balance text-2xl font-bold md:text-3xl">
            Welcome back, {userDoc?.name?.split(" ")[0] || "there"}! Thank you for being a changemaker.
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-primary-foreground/80 md:text-base">
            Your generosity has helped serve thousands of meals this year. Here&apos;s a snapshot of your impact so far.
          </p>
          <Button asChild variant="secondary" className="mt-5 rounded-xl">
            <Link href="/donor/browse">Browse Organizations <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </span>
            <p className="mt-4 text-3xl font-bold text-foreground">₹{totalAmountDonated.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-sm font-medium text-foreground">Total Amount Donated</p>
            <p className="text-xs text-muted-foreground">Meals, items &amp; more · Completed only</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-bold text-green-600">{completedDonations.length}</p>
            <p className="mt-1 text-sm font-medium text-foreground">Completed Donations</p>
            <p className="text-xs text-muted-foreground">Showing these ↓</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-bold text-blue-600">{completedOrgs.length}</p>
            <p className="mt-1 text-sm font-medium text-foreground">Organizations Supported</p>
            <p className="text-xs text-muted-foreground">With completed donations</p>
          </div>
        </section>

        {/* My Donations + Recommended */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* My Donations with org filter tabs */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">My Donations</h2>
              <Link href="/donor/donations" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Org filter tabs */}
            {completedOrgs.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setOrgFilter("All")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${orgFilter === "All" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                >
                  All <span className="ml-1 text-xs">{displayDonations.length}</span>
                </button>
                {completedOrgs.map((org: { id: string; name: string; count: number }) => (
                  <button
                    key={org.id}
                    onClick={() => setOrgFilter(org.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${orgFilter === org.id ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                  >
                    {org.name} <span className="ml-1 text-xs">{org.count}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="mb-3 text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{filteredDonations.length}</strong> completed donations
            </p>

            {/* Donation list */}
            <ul className="flex flex-col gap-3">
              {filteredDonations.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No completed donations yet.</p>
              ) : (
                filteredDonations.map((d: DonationDoc) => {
                  const org = orgMap.get(d.organizationId)
                  const orgName = org?.organizationName || org?.name || "Organization"
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-background px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <HandHeart className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{isMealDonation(d) ? (d.mealType ? `${d.mealType} Sponsorship` : "Meal Sponsorship") : d.itemName ? `${d.itemName} Donation` : d.occasion || "Sponsorship"}</p>
                        <p className="text-xs text-muted-foreground">
                          {getDisplayDate(d) !== "—" && <span>{getDisplayDate(d)} · </span>}
                          <span className="font-medium text-foreground">{getContribution(d)}</span>
                          <span> · {orgName}</span>
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                    </li>
                  )
                })
              )}
            </ul>
          </div>

          {/* Recommended — only shown when there are actionable items */}
          {recommended.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Recommended For You</h2>
            </div>

              <div className="flex flex-col gap-3">
                {recommended.map((item: RecommendedItem) => {
                  const tierColors: Record<RecommendedTier, string> = {
                    high:   "bg-red-50 text-red-600",
                    medium: "bg-blue-50 text-blue-600",
                    low:    "bg-amber-50 text-amber-700",
                  }
                  const badgeClass = tierColors[item.tier as RecommendedTier]

                  if (item.type === "requirement") {
                    const { req, org, tierLabel } = item
                    const orgId = org.orgId || org.uid
                    const remaining = (req.totalQuantity ?? 0) - (req.fulfilledQuantity ?? 0)
                    return (
                      <div key={`req-${req.id}`} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground text-sm">{org.organizationName || org.name}</p>
                            {org.city && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />{org.city}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{tierLabel}</span>
                        </div>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                          <Package className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium text-foreground">{req.title}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">Needs {remaining} {req.unit} · {req.priority} priority</p>
                        <Button asChild size="sm" className="w-full rounded-lg">
                          <Link href={`/donor/sponsor?org=${orgId}&req=${req.id}&item=${encodeURIComponent(req.title)}&unit=${encodeURIComponent(req.unit)}&remaining=${remaining}`}>
                            Donate Now <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    )
                  } else {
                    const { slot, org, tierLabel } = item
                    const orgId = org.orgId || org.uid
                    const totalNeeded = slot.totalNeeded ?? 0
                    const sponsored = slot.sponsored ?? 0
                    const mealsNeeded = totalNeeded - sponsored
                    const fillPct = totalNeeded > 0 ? Math.round((sponsored / totalNeeded) * 100) : 0
                    // Human-readable date: "Today" / "Tomorrow" / "28 Jun"
                    const slotDateLabel = (() => {
                      if (slot.date === tomorrowDateStr) return "Tomorrow"
                      try {
                        const [y, m, d] = slot.date.split("-").map(Number)
                        return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      } catch { return slot.date }
                    })()
                    // Availability label
                    const availLabel = slot.status === "Partially Filled"
                      ? `${mealsNeeded} of ${totalNeeded} meals open`
                      : `${totalNeeded} meals · Open`
                    return (
                      <div key={`slot-${slot.id}`} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground text-sm">{org.organizationName || org.name}</p>
                            {org.city && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />{org.city}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{tierLabel}</span>
                        </div>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium text-foreground">{slot.title}</span>
                          <span className="text-muted-foreground">· {slotDateLabel}</span>
                        </p>
                        {/* Availability bar */}
                        <div className="mb-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-muted-foreground">{availLabel}</span>
                            {slot.status === "Partially Filled" && (
                              <span className="text-xs font-medium text-amber-600">{fillPct}% filled</span>
                            )}
                            {slot.status === "Available" && (
                              <span className="text-xs font-medium text-emerald-600">Available</span>
                            )}
                          </div>
                          {totalNeeded > 0 && (
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${fillPct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{slot.mealType ?? "Meal"}</p>
                        <Button asChild size="sm" className="w-full rounded-lg">
                          <Link href={`/donor/sponsor?org=${orgId}&slot=${slot.id}&date=${slot.date}&meals=${mealsNeeded}`}>
                            Sponsor Slot <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    )
                  }
                })}
                <Link href="/donor/browse" className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  View all organizations <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
          </div>
          )}
        </section>
      </div>
    </>
  )
}