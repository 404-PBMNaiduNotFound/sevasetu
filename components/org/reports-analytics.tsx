"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDays, Download, Gift, Utensils, Users, Package, X, Calendar, Tag, Hash, MessageSquare, Building2, CheckCircle2, IndianRupee } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { useAuth } from "@/lib/auth-context"
import { getOrgDonations, getOrgOrders, getUser, type DonationDoc, type OrderDoc } from "@/lib/firestore"
import { tsToDate, formatFirestoreDate } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// ── Helper: is this an item-type donation (requirement OR own-item)? ──────────
function isItemDonation(d: DonationDoc): boolean {
  return (
    Boolean(d.requirementId) ||
    Boolean(d.isOwnItem) ||
    // Fallback for older records without isOwnItem flag
    (!d.requirementId && !d.slotId && Boolean(d.itemName))
  )
}

// ── Donation Detail Modal ─────────────────────────────────────────────────────

function DonationDetailModal({
  donation,
  donorName,
  onClose,
}: {
  donation: DonationDoc | null
  donorName: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!donation) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [donation, onClose])

  if (!donation) return null

  const isItem = isItemDonation(donation)
  const isOwnItem =
    Boolean(donation.isOwnItem) ||
    (!donation.requirementId && !donation.slotId && Boolean(donation.itemName))

  const displayDate = donation.donationDate
    ? new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : formatFirestoreDate(donation.createdAt ?? donation.updatedAt)

  const rows = [
    { icon: <Building2 className="h-4 w-4" />, label: "Donor", value: donorName },
    {
      icon: <Tag className="h-4 w-4" />,
      label: "Type",
      value: (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          isOwnItem
            ? "bg-purple-100 text-purple-700"
            : isItem
            ? "bg-blue-100 text-blue-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {isOwnItem ? "Self Donation" : isItem ? "Item Donation" : "Meal Sponsorship"}
        </span>
      ),
    },
    ...(isItem
      ? [
          { icon: <Package className="h-4 w-4" />, label: "Item", value: donation.itemName ?? "—" },
          { icon: <Hash className="h-4 w-4" />, label: "Quantity", value: `${donation.quantity ?? 0} ${donation.unit ?? "units"}` },
        ]
      : [{ icon: <Hash className="h-4 w-4" />, label: "Meals", value: donation.meals ? `${donation.meals} meals` : "—" }]),
    ...(donation.occasion ? [{ icon: <Tag className="h-4 w-4" />, label: "Occasion", value: donation.occasion }] : []),
    { icon: <Calendar className="h-4 w-4" />, label: "Date", value: displayDate },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOwnItem ? "bg-purple-50" : "bg-green-50"}`}>
              {isOwnItem
                ? <Gift className="h-5 w-5 text-purple-600" />
                : <CheckCircle2 className="h-5 w-5 text-green-600" />
              }
            </span>
            <div>
              <p className="font-semibold text-gray-900">
                {donation.itemName ? `${donation.itemName} Donation` : donation.occasion || "Meal Sponsorship"}
              </p>
              <p className="text-xs text-gray-400">{donorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Completed</span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
            {rows.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <span className="text-gray-400">{icon}</span>
                <span className="text-sm text-gray-500 w-24 shrink-0">{label}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          {donation.message && (
            <div className="mt-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <MessageSquare className="h-3.5 w-3.5" />Note
              </p>
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                {donation.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Export helper (xlsx via SheetJS) ─────────────────────────────────────────

async function exportToExcel(
  completed: DonationDoc[],
  donorNames: Record<string, string>
) {
  const XLSX = await import("xlsx")

  const now = new Date()
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  const uniqueDonors = new Set(completed.map((d) => d.donorId)).size
  const totalMeals = completed.reduce((s, d) => s + (d.meals ?? 0), 0)
  // Count items from both requirement donations AND own-item donations
  const totalItems = completed
    .filter((d) => isItemDonation(d))
    .reduce((s, d) => s + (d.quantity ?? 0), 0)

  const summaryData = [
    ["Donation Report", "", `Generated: ${dateStr}`],
    [],
    ["Metric", "Value"],
    ["Total Completed Donations", completed.length],
    ["Unique Donors (Completed)", uniqueDonors],
    ["Total Meals Funded", totalMeals],
    ["Total Items Donated", totalItems],
    ["Total Meals + Items", totalMeals + totalItems],
  ]

  const donationRows = completed.map((d) => ({
    "Donor Name": donorNames[d.donorId] ?? "Unknown",
    "Type": isItemDonation(d)
      ? (d.isOwnItem || (!d.requirementId && !d.slotId && d.itemName) ? "Self Donation" : "Item Donation")
      : "Meal Sponsorship",
    "Item": d.itemName ?? "—",
    "Quantity": isItemDonation(d) ? (d.quantity ?? 0) : "—",
    "Unit": d.unit ?? "—",
    "Meals": d.meals ?? 0,
    "Occasion": d.occasion ?? "—",
    "Date": d.donationDate
      ? new Date(d.donationDate).toLocaleDateString("en-IN")
      : formatFirestoreDate(d.createdAt ?? d.updatedAt),
    "Status": d.status,
    "Message": d.message ?? "",
  }))

  const wb = XLSX.utils.book_new()

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

  const wsDonations = XLSX.utils.json_to_sheet(donationRows)
  wsDonations["!cols"] = [
    { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 30 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDonations, "Completed Donations")

  XLSX.writeFile(wb, `donation-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.xlsx`)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReportsAnalytics() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<DonationDoc[]>([])
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [donorNames, setDonorNames] = useState<Record<string, string>>({})
  const [selectedDonation, setSelectedDonation] = useState<DonationDoc | null>(null)
  const [exporting, setExporting] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await getOrgDonations(user.uid)
      setDonations(data)
      const uniqueIds = [...new Set(data.map((d) => d.donorId))]
      const entries = await Promise.all(
        uniqueIds.map(async (id) => {
          const profile = await getUser(id)
          return [id, profile?.name ?? "Unknown Donor"] as const
        })
      )
      setDonorNames(Object.fromEntries(entries))

      // Vendor orders carry the item/meal cost for donations fulfilled through
      // the "find vendor" flow — donations.amount stays 0 for those, so the
      // real cost has to be pulled from here and added in (same as the
      // donor Impact page's Total Amount Donated card).
      const ordersData = await getOrgOrders(user.uid)
      setOrders(ordersData)
    } catch (error) {
      console.error("Failed to load reports data:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => { loadData() }, [loadData])

  const completed = useMemo(() => donations.filter((d) => d.status === "Completed"), [donations])

  // Map donationId -> order, so each donation can be matched to the vendor
  // order (if any) that carries its real item cost — same as the donor
  // Impact page.
  const orderByDonationId = useMemo(() => {
    const map: Record<string, OrderDoc> = {}
    orders.forEach((o) => { if (o.donationId) map[o.donationId] = o })
    return map
  }, [orders])

  const stats = useMemo(() => {
    const totalDonations = completed.length
    const totalMeals = completed.reduce((s, d) => s + (d.meals ?? 0), 0)
    // ✅ Count items from requirement donations AND own-item donations
    const totalItems = completed
      .filter((d) => isItemDonation(d))
      .reduce((s, d) => s + (d.quantity ?? 0), 0)
    const uniqueDonors = new Set(completed.map((d) => d.donorId)).size

    // Total amount received across every donation type (meals, items, own-items, etc.) —
    // Completed only. Most donations carry their paid amount directly on donations.amount
    // (e.g. requirement checkout). Donations fulfilled via the "find vendor" flow record
    // their cost on the matching orders.amount instead (donations.amount is 0 in that case)
    // — so fall back to the linked order's amount whenever the donation itself has none.
    const totalAmount = completed.reduce((s, d) => {
      const donationAmount = d.amount ?? 0
      const orderAmount = d.id ? orderByDonationId[d.id]?.amount ?? 0 : 0
      return s + (donationAmount > 0 ? donationAmount : orderAmount)
    }, 0)

    return [
      { label: "Total Amount Received", value: `₹${totalAmount.toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-emerald-50 text-emerald-600" },
      { label: "Total Donations", value: String(totalDonations), icon: Gift },
      { label: "Total Meals", value: totalMeals.toLocaleString("en-IN"), icon: Utensils },
      { label: "Total Items", value: String(totalItems), icon: Package },
      { label: "Total Donors", value: String(uniqueDonors), icon: Users },
    ]
  }, [completed, orderByDonationId])

  // Chart — completed donations only, last 7 days
  const chartData = useMemo(() => {
    const now = new Date()
    const days: { day: string; meals: number; items: number; date: Date }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      days.push({ day: `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`, meals: 0, items: 0, date: d })
    }
    for (const donation of completed) {
      if (!donation.createdAt) continue
      const donDate = tsToDate(donation.createdAt as any) ?? new Date()
      const bucket = days.find(
        (b) =>
          b.date.getFullYear() === donDate.getFullYear() &&
          b.date.getMonth() === donDate.getMonth() &&
          b.date.getDate() === donDate.getDate()
      )
      if (bucket) {
        bucket.meals += donation.meals ?? 0
        // ✅ Count items from requirement donations AND own-item donations
        if (isItemDonation(donation)) bucket.items += donation.quantity ?? 0
      }
    }
    return days.map(({ day, meals, items }) => ({ day, meals, items }))
  }, [completed])

  // Top donors — completed only
  const topDonations = useMemo(() => {
    const byDonor = new Map<string, { meals: number; items: number }>()
    for (const d of completed) {
      const cur = byDonor.get(d.donorId) ?? { meals: 0, items: 0 }
      cur.meals += d.meals ?? 0
      // ✅ Count items from requirement donations AND own-item donations
      if (isItemDonation(d)) cur.items += d.quantity ?? 0
      byDonor.set(d.donorId, cur)
    }
    return [...byDonor.entries()]
      .sort((a, b) => (b[1].meals + b[1].items) - (a[1].meals + a[1].items))
      .slice(0, 3)
      .map(([donorId, { meals, items }]) => ({
        name: donorNames[donorId] ?? donorId.slice(0, 8) + "…",
        meals,
        items,
      }))
  }, [completed, donorNames])

  const maxScore = Math.max(...topDonations.map((d) => d.meals + d.items), 1)

  const timeline = useMemo(
    () => [...completed].sort((a, b) => ((b.createdAt as any)?.seconds ?? 0) - ((a.createdAt as any)?.seconds ?? 0)),
    [completed]
  )

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportToExcel(completed, donorNames)
    } finally {
      setExporting(false)
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
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white text-gray-900">Reports &amp; Analytics</h1>
          <p className="mt-1 text-gray-600 text-white ">Track completed donations and meals served over time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
            <CalendarDays className="h-4 w-4 text-blue-700" />
            Last 7 days
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || completed.length === 0}
            className="bg-white inline-flex items-center gap-2 rounded-xl  px-6 py-2.5 font-medium text-blue transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-6 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color ?? "bg-blue-50 text-blue-700"}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            <p className="text-xs text-gray-400">Completed only</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Line chart */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900">Donations Over Time</h2>
          <p className="mb-4 text-sm text-gray-500">Meals and items from completed donations — last 7 days</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                <Line type="monotone" dataKey="meals" name="Meals" stroke="#1D4ED8" strokeWidth={3} dot={{ r: 4, fill: "#1D4ED8" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="items" name="Items" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, fill: "#16A34A" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top donors */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Top Donors</h2>
          <p className="mb-4 text-sm text-gray-500">Highest contributors (completed only)</p>
          {topDonations.length === 0 ? (
            <p className="text-sm text-gray-400">No completed donations yet.</p>
          ) : (
            <div className="space-y-5">
              {topDonations.map((d, i) => (
                <div key={d.name + i}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{d.name}</span>
                    </div>
                    <div className="text-right">
                      {d.meals > 0 && <span className="text-sm font-semibold text-gray-600">{d.meals.toLocaleString()} meals</span>}
                      {d.items > 0 && <span className="ml-2 text-xs text-gray-400">{d.items} items</span>}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-700" style={{ width: `${((d.meals + d.items) / maxScore) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Impact Timeline */}
      {timeline.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Impact Timeline</h2>
          <p className="mb-5 text-sm text-gray-500">Completed donation history — click any entry for details</p>
          <div className="relative flex flex-col gap-0">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-100" />
            {timeline.map((d, i) => {
              const date = formatFirestoreDate(d.createdAt ?? d.updatedAt)
              const label = d.itemName
                ? `Donated ${d.quantity ?? ""} ${d.unit ?? "units"} of ${d.itemName}`
                : d.meals
                ? `Sponsored ${d.meals} meals`
                : d.occasion
                ? `${d.occasion} contribution`
                : "Made a contribution"
              const donor = donorNames[d.donorId] ?? "—"

              return (
                <div
                  key={d.id ?? i}
                  onClick={() => setSelectedDonation(d)}
                  className="relative flex gap-4 pb-6 last:pb-0 cursor-pointer group"
                >
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 border-2 border-green-200 group-hover:border-green-400 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 pt-1.5 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{donor} · {date}</p>
                  </div>
                  <span className="mt-1 shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Completed
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Detail modal */}
      <DonationDetailModal
        donation={selectedDonation}
        donorName={selectedDonation ? (donorNames[selectedDonation.donorId] ?? "—") : ""}
        onClose={() => setSelectedDonation(null)}
      />
    </div>
  )
}