"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Eye, Users, Utensils, Gift, X, Calendar, Package, Hash, Tag, MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getOrgDonations, getUser, type DonationDoc, type UserDoc } from "@/lib/firestore"
import { Spinner } from "@/components/ui/spinner"

interface DonorStats {
  id: string
  name: string
  donations: number
  meals: number
  items: number
  lastDonation: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function statusClasses(status: DonationDoc["status"]) {
  switch (status) {
    case "Approved":  return "bg-green-100 text-green-700"
    case "Completed": return "bg-blue-100 text-blue-700"
    case "Pending":   return "bg-amber-100 text-amber-700"
    case "Rejected":  return "bg-red-100 text-red-700"
    default:          return "bg-gray-100 text-gray-600"
  }
}

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

function resolveDonationType(donation: DonationDoc): {
  isOwnItem: boolean
  isRequirementDonation: boolean
} {
  const isOwnItem =
    Boolean(donation.isOwnItem) ||
    (!donation.requirementId && !donation.slotId && Boolean(donation.itemName))
  const isRequirementDonation = !isOwnItem && Boolean(donation.requirementId)
  return { isOwnItem, isRequirementDonation }
}

function DonorDonationsModal({
  donor,
  allDonations,
  onClose,
}: {
  donor: DonorStats | null
  allDonations: DonationDoc[]
  onClose: () => void
}) {
  useEffect(() => {
    if (!donor) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [donor, onClose])

  if (!donor) return null

  const statusOrder: Record<string, number> = { Completed: 0, Approved: 1, Pending: 2, Rejected: 3 }
  const donorDonations = allDonations
    .filter((d) => d.donorId === donor.id)
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-gray-100 bg-white shadow-xl max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {initials(donor.name)}
            </span>
            <div>
              <p className="font-semibold text-gray-900">{donor.name}</p>
              <p className="text-xs text-gray-400">
                {donor.donations} completed · {donor.meals} meals · {donor.items} items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {donorDonations.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No donations found for this donor.</p>
          ) : (
            donorDonations.map((d, i) => {
              const { isOwnItem } = resolveDonationType(d)
              const isItem = Boolean(d.requirementId) || isOwnItem
              const displayDate = d.donationDate
                ? new Date(d.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : formatTs(d.createdAt ?? d.updatedAt)

              return (
                <div key={d.id ?? i} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {d.status === "Completed"
                        ? isItem
                          ? `${d.itemName ?? "Item Donation"}${d.quantity ? ` · Qty ${d.quantity} ${d.unit ?? ""}` : ""}`
                          : d.meals
                          ? `${d.mealType ? `${d.mealType} · ` : ""}${d.meals} meals`
                          : d.mealType ? `${d.mealType} Sponsorship` : "Meal Sponsorship"
                        : isItem
                        ? d.itemName ?? "Item Donation"
                        : d.mealType ? `${d.mealType} Sponsorship` : "Meal Sponsorship"}
                    </span>
                    <div className="flex items-center gap-2">
                      {isOwnItem && (
                        <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                          Self Donation
                        </span>
                      )}
                      <span className={"inline-block rounded-full px-2.5 py-0.5 text-xs font-medium " + statusClasses(d.status)}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                  {d.status === "Approved" && (
                    <p className="mb-2 text-xs text-amber-600 font-medium">Awaiting completion</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {displayDate}
                    </span>
                    {d.occasion && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        {d.occasion}
                      </span>
                    )}
                  </div>
                  {d.message && (
                    <p className="mt-2 flex items-start gap-1 text-xs text-gray-500">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {d.message}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export function DonorsList() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [donorsData, setDonorsData] = useState<DonorStats[]>([])
  const [allDonations, setAllDonations] = useState<DonationDoc[]>([])
  const [query, setQuery] = useState("")
  const [selectedDonor, setSelectedDonor] = useState<DonorStats | null>(null)

  const loadDonors = useCallback(async () => {
    if (!user?.uid) return

    setLoading(true)
    try {
      const donations = await getOrgDonations(user.uid)
      setAllDonations(donations)

      const completedDonations = donations.filter((d) => d.status === "Completed")

      const lastDateMap: Record<string, import("firebase/firestore").Timestamp | undefined> = {}
      donations.forEach((d) => {
        if (
          d.createdAt &&
          (!lastDateMap[d.donorId] || d.createdAt.seconds > (lastDateMap[d.donorId]?.seconds ?? 0))
        ) {
          lastDateMap[d.donorId] = d.createdAt
        }
      })

      const groups: Record<string, { count: number; meals: number; items: number }> = {}
      completedDonations.forEach((d) => {
        if (!groups[d.donorId]) groups[d.donorId] = { count: 0, meals: 0, items: 0 }
        groups[d.donorId].count += 1
        groups[d.donorId].meals += d.meals ?? 0
        // FIX: count items for both requirement donations AND own-item donations
        if (d.requirementId || d.isOwnItem) groups[d.donorId].items += d.quantity ?? 0
      })

      const donorIds = Object.keys(groups)
      const donorProfiles = await Promise.all(
        donorIds.map(async (id) => {
          const profile = await getUser(id)
          return { id, profile }
        })
      )

      const stats: DonorStats[] = donorProfiles.map(({ id, profile }) => {
        const group = groups[id]
        const lastDate = lastDateMap[id]?.toDate ? lastDateMap[id]!.toDate() : new Date()
        return {
          id,
          name: profile?.name || "Unknown Donor",
          donations: group.count,
          meals: group.meals,
          items: group.items,
          lastDonation: lastDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        }
      })

      setDonorsData(stats)
    } catch (error) {
      console.error("Failed to load donors:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    loadDonors()
  }, [loadDonors])

  const filtered = useMemo(
    () => donorsData.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase())),
    [donorsData, query],
  )

  const totals = useMemo(
    () => ({
      donors: donorsData.length,
      donations: donorsData.reduce((s, d) => s + d.donations, 0),
      meals: donorsData.reduce((s, d) => s + d.meals, 0),
      items: donorsData.reduce((s, d) => s + d.items, 0),
    }),
    [donorsData],
  )

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8 overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-white text-gray-900">Donors</h1>
        <p className="mt-1 text-gray-600 text-white">Manage and review everyone supporting your organization.</p>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-4">
        <SummaryCard icon={Users} label="Total Donors" value={totals.donors.toString()} sub="Completed" />
        <SummaryCard icon={Gift} label="Total Donations" value={totals.donations.toString()} sub="Completed only" />
        <SummaryCard icon={Utensils} label="Total Meals" value={totals.meals.toLocaleString()} sub="Completed only" />
        <SummaryCard icon={Package} label="Total Items" value={totals.items.toLocaleString()} sub="Completed only" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search donors..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search donors"
            />
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3 font-medium">Donor</th>
                <th className="px-6 py-3 font-medium">Completed</th>
                <th className="px-6 py-3 font-medium">Meals</th>
                <th className="px-6 py-3 font-medium">Items</th>
                <th className="px-6 py-3 font-medium">Last Donation</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {initials(d.name)}
                      </span>
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{d.donations}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {d.meals} Meals
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {d.items > 0 ? (
                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        {d.items} Items
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{d.lastDonation}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedDonor(d)}
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {filtered.map((d) => (
            <div key={d.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {initials(d.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-400">Last donation {d.lastDonation}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                  <span>{d.donations} completed</span>
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {d.meals} Meals
                  </span>
                  {d.items > 0 && (
                    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {d.items} Items
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDonor(d)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-700 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-gray-500">
            {donorsData.length === 0 ? "You don't have any completed donors yet." : `No donors match "${query}".`}
          </div>
        )}
      </div>

      <DonorDonationsModal
        donor={selectedDonor}
        allDonations={allDonations}
        onClose={() => setSelectedDonor(null)}
      />
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}