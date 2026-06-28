"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Users,
  HeartHandshake,
  TrendingUp,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  X,
  User,
  Mail,
  Calendar,
  Package,
  Tag,
  MessageSquare,
  ArrowRight,
  IndianRupee,
} from "lucide-react"
import type { Timestamp } from "firebase/firestore"
import type { DonationDoc, OrderDoc, OrganizationDoc, RequirementDoc, SlotDoc } from "@/lib/firestore"

const STAT_STYLES = [
  { iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { iconBg: "bg-blue-50",   iconColor: "text-blue-700"  },
  { iconBg: "bg-green-50",  iconColor: "text-green-600" },
  { iconBg: "bg-amber-50",  iconColor: "text-amber-600" },
  { iconBg: "bg-slate-100", iconColor: "text-slate-600" },
]

function tsToDate(ts: any): Date | null {
  if (!ts) return null
  if (typeof ts.toDate === "function") return ts.toDate()
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000)
  return null
}

function formatDate(ts: any): string {
  if (!ts) return "—"
  const d = tsToDate(ts)
  if (!d || isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatLastUpdated(date: Date | null) {
  if (!date) return "—"
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function computeDelta(current: number, previous: number) {
  if (previous === 0) return { delta: current > 0 ? "+100%" : "0%", up: current >= 0 }
  const pct = ((current - previous) / previous) * 100
  return { delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 }
}

function statusClasses(status: string) {
  switch (status) {
    case "Approved":  return "bg-green-100 text-green-700"
    case "Completed": return "bg-blue-100 text-blue-700"
    case "Pending":   return "bg-amber-100 text-amber-700"
    case "Rejected":  return "bg-red-100 text-red-700"
    default:          return "bg-gray-100 text-gray-600"
  }
}

function slotStatusClasses(status: SlotDoc["status"]) {
  switch (status) {
    case "Full":            return "bg-blue-100 text-blue-700"
    case "Partially Filled":return "bg-amber-100 text-amber-700"
    default:                return "bg-green-100 text-green-700"
  }
}

function slotDotClass(status: SlotDoc["status"]) {
  switch (status) {
    case "Full":            return "bg-blue-500"
    case "Partially Filled":return "bg-amber-500"
    default:                return "bg-green-500"
  }
}

function getContribution(d: DonationDoc) {
  if (d.itemName) return `${d.itemName} — ${d.quantity ?? 0} ${d.unit ?? ""}`
  if (d.quantity)  return `Qty: ${d.quantity} ${d.unit ?? ""}`
  if (d.meals)     return `${d.meals} meals`
  return "Meal Sponsorship"
}

function getDonationDate(d: DonationDoc) {
  if (d.donationDate) {
    const date = new Date(d.donationDate)
    if (!isNaN(date.getTime())) return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }
  return formatDate(d.createdAt ?? d.updatedAt)
}

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
type DonationRow = {
  raw: DonationDoc
  name: string
  email: string
  requirement: string
  contribution: string
  date: string
  status: DonationDoc["status"]
}

function DonationDetailModal({ row, onClose }: { row: DonationRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Donation Details</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex items-center justify-between">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(row.status)}`}>
              {row.status}
            </span>
            <span className="text-xs text-gray-400">ID: {row.raw.id?.slice(0, 8)}…</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <User className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-gray-900">{row.name}</p>
                <p className="text-xs text-gray-400">Donor</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <Mail className="h-4 w-4" />
              </span>
              <p className="text-sm text-gray-700">{row.email || "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</p>
              <p className="text-sm font-semibold text-gray-900">{row.date}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Tag className="h-3 w-3" /> Occasion</p>
              <p className="text-sm font-semibold text-gray-900">{row.raw.occasion || "—"}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Contribution</p>
              <p className="text-sm font-semibold text-gray-900">{row.contribution}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1">Requirement</p>
              <p className="text-sm font-semibold text-gray-900">{row.requirement}</p>
            </div>
          </div>

          {row.raw.message && (
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Message</p>
              <p className="text-sm leading-relaxed text-gray-700">{row.raw.message}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Today's Slot Updates Panel ────────────────────────────────────────────────
function TodaySlotsPanel({ slots }: { slots: SlotDoc[] }) {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 2)
  const targetIso = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`
  const targetSlots = slots.filter((s) => s.date === targetIso)

  const summary = targetSlots.reduce(
    (acc, s) => {
      acc.sponsored += Math.min(s.sponsored, s.totalNeeded)
      acc.total += s.totalNeeded
      return acc
    },
    { sponsored: 0, total: 0 }
  )
  const percent = summary.total > 0 ? Math.min(100, Math.round((summary.sponsored / summary.total) * 100)) : 0

  const targetLabel = targetDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

  return (
    <Link
      href="/org/slots"
      className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">2 Days After Slots</h3>
          <p className="text-xs text-gray-400 mt-0.5">{targetLabel}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-blue-600 shrink-0" />
      </div>

      {/* Progress */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">
            {summary.sponsored}/{summary.total} Meals Sponsored
          </span>
          <span className="text-gray-400 text-xs">{percent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Slot list */}
      <div className="flex flex-col divide-y divide-gray-50 flex-1 overflow-y-auto max-h-72">
        {targetSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
            <p className="text-sm text-gray-400">No slots for this date.</p>
            <p className="text-xs text-gray-300 mt-1">Go to Sponsorship Slots to add one.</p>
          </div>
        ) : (
          targetSlots.map((slot) => {
            const sponsored = Math.min(slot.sponsored, slot.totalNeeded)
            const slotPercent = slot.totalNeeded > 0 ? Math.round((sponsored / slot.totalNeeded) * 100) : 0
            return (
              <div key={slot.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${slotDotClass(slot.status)}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{slot.mealType ?? "Meal"}</p>
                    <p className="text-xs text-gray-400">{sponsored}/{slot.totalNeeded} meals</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${slotStatusClasses(slot.status)}`}>
                  {slot.status}
                </span>
              </div>
            )
          })
        )}
      </div>
    </Link>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export interface OrgDashboardProps {
  org: OrganizationDoc | null
  userName: string
  donations: DonationDoc[]
  orders?: OrderDoc[]
  requirements: RequirementDoc[]
  donorNames: Record<string, { name: string; email: string }>
  lastUpdated: Date | null
  slots?: SlotDoc[]
}

export function OrgDashboard({ org, userName, donations, orders = [], requirements, donorNames, lastUpdated, slots = [] }: OrgDashboardProps) {
  const [selectedRow, setSelectedRow] = useState<DonationRow | null>(null)

  const completedDonations = useMemo(
    () => donations.filter((d) => d.status === "Completed"),
    [donations]
  )

  const reqMap = useMemo(
    () => new Map(requirements.filter((r) => r.id).map((r) => [r.id!, r])),
    [requirements]
  )

  // Map donationId -> order, so each donation can be matched to the vendor
  // order (if any) that carries its real item cost — same as the donor
  // Impact page.
  const orderByDonationId = useMemo(() => {
    const map: Record<string, OrderDoc> = {}
    orders.forEach((o) => { if (o.donationId) map[o.donationId] = o })
    return map
  }, [orders])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonthKey = getMonthKey(now)
    const lastMonthKey = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

    const totalDonations = completedDonations.length
    const uniqueDonors   = new Set(completedDonations.map((d) => d.donorId)).size
    const activeReqs     = requirements.filter((r) => r.status !== "Fulfilled").length
    const fulfilledReqs  = requirements.filter((r) => r.status === "Fulfilled").length

    const thisMonth = completedDonations.filter((d) => {
      const date = tsToDate(d.createdAt as any)
      return date && getMonthKey(date) === thisMonthKey
    })
    const lastMonth = completedDonations.filter((d) => {
      const date = tsToDate(d.createdAt as any)
      return date && getMonthKey(date) === lastMonthKey
    })

    const countDelta  = computeDelta(thisMonth.length, lastMonth.length)
    const donorsDelta = computeDelta(
      new Set(thisMonth.map((d) => d.donorId)).size,
      new Set(lastMonth.map((d) => d.donorId)).size
    )

    // Total amount received across every donation type (meals, items, own-items, etc.) —
    // Completed only. Most donations carry their paid amount directly on donations.amount
    // (e.g. requirement checkout). Donations fulfilled via the "find vendor" flow record
    // their cost on the matching orders.amount instead (donations.amount is 0 in that case)
    // — so fall back to the linked order's amount whenever the donation itself has none.
    const totalAmount = completedDonations.reduce((s, d) => {
      const donationAmount = d.amount ?? 0
      const orderAmount = d.id ? orderByDonationId[d.id]?.amount ?? 0 : 0
      return s + (donationAmount > 0 ? donationAmount : orderAmount)
    }, 0)
    const thisMonthAmount = thisMonth.reduce((s, d) => {
      const donationAmount = d.amount ?? 0
      const orderAmount = d.id ? orderByDonationId[d.id]?.amount ?? 0 : 0
      return s + (donationAmount > 0 ? donationAmount : orderAmount)
    }, 0)
    const lastMonthAmount = lastMonth.reduce((s, d) => {
      const donationAmount = d.amount ?? 0
      const orderAmount = d.id ? orderByDonationId[d.id]?.amount ?? 0 : 0
      return s + (donationAmount > 0 ? donationAmount : orderAmount)
    }, 0)
    const amountDelta = computeDelta(thisMonthAmount, lastMonthAmount)

    return [
      { label: "Total Amount Received",  value: `₹${totalAmount.toLocaleString("en-IN")}`, delta: amountDelta.delta, up: amountDelta.up, icon: IndianRupee,   href: "/org/reports",      ...STAT_STYLES[0] },
      { label: "Completed Donations",    value: String(totalDonations), delta: countDelta.delta,  up: countDelta.up,  icon: Gift,           href: "/org/donations",    ...STAT_STYLES[1] },
      { label: "Unique Donors",          value: String(uniqueDonors),   delta: donorsDelta.delta, up: donorsDelta.up, icon: Users,          href: "/org/donors",       ...STAT_STYLES[2] },
      { label: "Active Requirements",    value: String(activeReqs),     delta: `+${activeReqs}`,  up: true,           icon: HeartHandshake, href: "/org/requirements", ...STAT_STYLES[3] },
      { label: "Fulfilled Requirements", value: String(fulfilledReqs),  delta: `+${fulfilledReqs}`,up: true,          icon: TrendingUp,     href: "/org/requirements", ...STAT_STYLES[4] },
    ]
  }, [completedDonations, requirements, orderByDonationId])

  const recentDonations = useMemo(
    () => donations.slice(0, 8).map((d): DonationRow => {
      const donor = donorNames[d.donorId]
      return {
        raw: d,
        name:         donor?.name ?? "Unknown Donor",
        email:        donor?.email ?? "",
        requirement:  (d.requirementId && reqMap.get(d.requirementId)?.title) || "General Donation",
        contribution: getContribution(d),
        date:         getDonationDate(d),
        status:       d.status,
      }
    }),
    [donations, donorNames, reqMap]
  )

  const displayName = org?.organizationName || org?.name || userName
  const welcomeName = displayName.split(" ")[0]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {selectedRow && (
        <DonationDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}

      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 rounded-2xl bg-primary px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {welcomeName}
          </h1>
          <p className="text-primary-foreground/80 leading-relaxed mt-1">
            {displayName} — here&apos;s what&apos;s happening across your requirements today.
          </p>
        </div>
        <span className="text-sm text-primary-foreground/60">Last updated: {formatLastUpdated(lastUpdated)}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-100 transition-all duration-200 block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <Icon size={20} className={stat.iconColor} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.delta}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Recent Contributions (70%) + Today's Slots (30%) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Recent donations table — 70% */}
        <div className="lg:w-[70%] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Recent Contributions</h3>
              <p className="text-sm text-gray-400 mt-0.5">Click a row to see full details</p>
            </div>
            <Link href="/org/donations" className="text-sm font-medium text-blue-700 hover:text-blue-800">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">Donor</th>
                  <th className="px-6 py-3 font-medium hidden md:table-cell">Requirement</th>
                  <th className="px-6 py-3 font-medium">Contribution</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentDonations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No donations yet.</td>
                  </tr>
                ) : (
                  recentDonations.map((row) => (
                    <tr
                      key={row.raw.id}
                      onClick={() => setSelectedRow(row)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-400">{row.date}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-600">{row.requirement}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">{row.contribution}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusClasses(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's slot updates — 30% */}
        <div className="lg:w-[30%]">
          <TodaySlotsPanel slots={slots} />
        </div>
      </div>
    </div>
  )
}