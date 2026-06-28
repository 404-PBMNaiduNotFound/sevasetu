"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, X, Building2, Calendar, Loader2, Mail, Tag, MessageSquare, Hash, Package, ChevronRight, Phone, Gift, Utensils } from "lucide-react"
import type { Timestamp } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import {
  getOrgDonations,
  getUser,
  updateDonationStatus,
  approveDonationWithFulfillment,
  createNotification,
  type DonationDoc,
} from "@/lib/firestore"

type Status = DonationDoc["status"]

const tabs: { value: Status | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Completed", label: "Completed" },
  { value: "Rejected", label: "Rejected" },
]

function statusClasses(status: Status) {
  switch (status) {
    case "Approved":  return "bg-green-100 text-green-700"
    case "Completed": return "bg-blue-100 text-blue-700"
    case "Pending":   return "bg-amber-100 text-amber-700"
    case "Rejected":  return "bg-red-100 text-red-700"
    default:          return "bg-gray-100 text-gray-600"
  }
}

function formatDate(ts?: any) {
  if (!ts) return "—"
  const date = typeof ts.toDate === "function"
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

function sortDonations(donations: DonationView[], sortBy: "newest" | "oldest"): DonationView[] {
  return [...donations].sort((a, b) => {
    const aVal = getTimestampValue(a.createdAt) || getTimestampValue(a.updatedAt)
    const bVal = getTimestampValue(b.createdAt) || getTimestampValue(b.updatedAt)
    return sortBy === "newest" ? bVal - aVal : aVal - bVal
  })
}

type DonationView = DonationDoc & { donorName: string; donorEmail: string; donorPhone: string }

function resolveDonationType(donation: DonationDoc | DonationView): {
  isOwnItem: boolean
  isRequirementDonation: boolean
  isMeal: boolean
} {
  const isMeal =
    Boolean(donation.slotId) ||
    (!donation.requirementId && !donation.isOwnItem &&
      (donation.itemName === "meals" || Boolean(donation.meals)))
  const isOwnItem =
    !isMeal &&
    (Boolean(donation.isOwnItem) ||
      (!donation.requirementId && !donation.slotId &&
        Boolean(donation.itemName) && donation.itemName !== "meals"))
  const isRequirementDonation = !isOwnItem && !isMeal && Boolean(donation.requirementId)
  return { isOwnItem, isRequirementDonation, isMeal }
}

function DonationDetailModal({
  donation,
  onClose,
  onApprove,
  onReject,
  acting,
}: {
  donation: DonationView | null
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  acting: string | null
}) {
  useEffect(() => {
    if (!donation) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [donation, onClose])

  if (!donation) return null

  const isActing = acting === donation.id
  const { isOwnItem, isRequirementDonation, isMeal } = resolveDonationType(donation)
  const displayDate = donation.submissionDate
    ? new Date(donation.submissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : donation.createdAt
    ? (typeof (donation.createdAt as any).toDate === "function"
      ? (donation.createdAt as any).toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : new Date((donation.createdAt as any).seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))
    : "—"

  const initials = donation.donorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Donation Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold">
               {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{donation.donorName}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="break-all">{donation.donorEmail || "—"}</span>
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{donation.donorPhone || "—"}</span>
              </p>
            </div>
            <span className={"inline-block rounded-full px-3 py-1 text-xs font-medium shrink-0 " + statusClasses(donation.status)}>
              {donation.status}
            </span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
            <DetailRow icon={<Tag className="h-4 w-4" />} label="Type">
              <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " + (
                isOwnItem
                  ? "bg-purple-100 text-purple-700"
                  : isRequirementDonation
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {isOwnItem ? "Self Donation" : isRequirementDonation ? "Item Donation" : donation.mealType ? `${donation.mealType} Sponsorship` : "Meal Sponsorship"}
              </span>
            </DetailRow>
            {(isRequirementDonation || isOwnItem) ? (
              <>
                {donation.itemName && (
                  <DetailRow icon={<Package className="h-4 w-4" />} label="Item">
                    {donation.itemName}
                  </DetailRow>
                )}
                <DetailRow icon={<Hash className="h-4 w-4" />} label="Quantity">
                  {donation.quantity ?? 0} {donation.unit || ""}
                </DetailRow>
              </>
            ) : (
              <>
                {donation.mealType && (
                  <DetailRow icon={<Utensils className="h-4 w-4" />} label="Meal">
                    {donation.mealType}
                  </DetailRow>
                )}
                <DetailRow icon={<Hash className="h-4 w-4" />} label="Meals">
                  {donation.meals || 0} meals
                </DetailRow>
              </>
            )}
            {donation.occasion && (
              <DetailRow icon={<ChevronRight className="h-4 w-4" />} label="Occasion">
                {donation.occasion}
              </DetailRow>
            )}
            <DetailRow icon={<Calendar className="h-4 w-4" />} label="Request Date">
              {displayDate}
            </DetailRow>
            {donation.slotId && donation.donationDate && (
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Slot Date">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {new Date(donation.donationDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  {donation.mealType ? ` · ${donation.mealType}` : ""}
                </span>
              </DetailRow>
            )}
            {donation.requirementId && (
              <DetailRow icon={<ChevronRight className="h-4 w-4" />} label="Requirement ID">
                <span className="font-mono text-xs">{donation.requirementId}</span>
              </DetailRow>
            )}
          </div>

          {donation.message && (
            <div className="mt-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <MessageSquare className="h-3.5 w-3.5" /> Note
              </p>
              <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                {donation.message}
              </p>
            </div>
          )}
        </div>

        {donation.status === "Pending" && (
          <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={() => donation.id && onApprove(donation.id)}
              disabled={isActing || !donation.id}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve
            </button>
            <button
              onClick={() => donation.id && onReject(donation.id)}
              disabled={isActing || !donation.id}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Reject
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 min-w-0 break-words">{children}</span>
    </div>
  )
}

function RequestCard({ donation, onApprove, onReject, acting, onClick }: {
  donation: DonationView
  onApprove: (id: string) => void
  onReject: (id: string) => void
  acting: string | null
  onClick: () => void
}) {
  const isActing = acting === donation.id
  const { isOwnItem, isRequirementDonation, isMeal } = resolveDonationType(donation)

  return (
    <div
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{donation.donorName}</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 min-w-0">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="break-all">{donation.donorEmail || "—"}</span>
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3 shrink-0" />
              {donation.donorPhone || "—"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " + (
                isOwnItem
                  ? "bg-purple-100 text-purple-700"
                  : isRequirementDonation
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {isOwnItem ? "Self Donation" : isRequirementDonation ? "Item Donation" : donation.mealType ? `${donation.mealType} Sponsorship` : "Meal Sponsorship"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                {donation.donationDate
                  ? new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : donation.submissionDate
                  ? new Date(donation.submissionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : formatDate(donation.createdAt ?? donation.updatedAt)}
              </span>
              {donation.slotId && donation.donationDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Calendar className="h-3 w-3" />
                  Slot: {new Date(donation.donationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {donation.mealType ? ` · ${donation.mealType}` : ""}
                </span>
              )}
              {(isRequirementDonation || isOwnItem) ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                  {donation.itemName ? donation.itemName + " · " : ""}Qty: {donation.quantity ?? 0} {donation.unit || ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                  {donation.mealType ? donation.mealType + " · " : ""}{donation.meals ? donation.meals + " meals" : "—"}
                </span>
              )}
              {donation.occasion && <span className="text-gray-500">{donation.occasion}</span>}
            </div>
            {donation.message && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{donation.message}</p>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col items-end gap-3 sm:w-auto">
          <span className={"inline-block rounded-full px-3 py-1 text-xs font-medium " + statusClasses(donation.status)}>
            {donation.status}
          </span>
          {donation.status === "Pending" && (
            <div className="flex w-full items-center gap-2 sm:w-auto" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => donation.id && onApprove(donation.id)}
                disabled={isActing || !donation.id}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60 sm:flex-none"
              >
                {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </button><br></br>
              <button
                onClick={() => donation.id && onReject(donation.id)}
                disabled={isActing || !donation.id}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 sm:flex-none"
              >
                {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </button><br></br>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function SponsorshipRequests() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<DonationView[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [tab, setTab] = useState<Status | "All">("All")
  const [mainTab, setMainTab] = useState<"standard" | "ownItems">("standard")
  const [selectedDonation, setSelectedDonation] = useState<DonationView | null>(null)
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest")

  const loadDonations = useCallback(async () => {
    if (!user?.uid) { setDonations([]); setLoading(false); return }
    setLoading(true)
    try {
      const data = await getOrgDonations(user.uid)
      const uniqueDonorIds = [...new Set(data.map((d) => d.donorId))]

      const donorEntries = await Promise.all(
        uniqueDonorIds.map(async (id) => {
          const donor = await getUser(id)
          return [id, {
            name: donor?.name ?? "Unknown Donor",
            email: donor?.email ?? "",
            phone: donor?.phone ?? "",
          }] as const
        })
      )
      const donorMap = Object.fromEntries(donorEntries)

      setDonations(
        data.map((d) => ({
          ...d,
          donorName: donorMap[d.donorId]?.name ?? "Unknown Donor",
          donorEmail: donorMap[d.donorId]?.email ?? "",
          donorPhone: d.donorPhone || donorMap[d.donorId]?.phone || "",
        }))
      )
    } catch (error) {
      console.error("Failed to load donations:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => { loadDonations() }, [loadDonations])

  function applyStatusUpdate(id: string, status: Status) {
    setDonations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    )
    setSelectedDonation((prev) => (prev?.id === id ? { ...prev, status } : prev))
  }

  const handleApprove = async (id: string) => {
    setActing(id)
    const donation = donations.find((d) => d.id === id)
    try {
      const result = await approveDonationWithFulfillment(id)
      if (result && (result as any).rejected) {
        // Slot/requirement was already full or over capacity — the donation
        // was rejected instead of approved to prevent a duplicate/overbooked
        // slot or requirement.
        const reason = (result as any).reason as string
        await createNotification({
          userId: donation?.donorId ?? "",
          title: "Donation Could Not Be Approved",
          body: reason,
          type: "donation",
        })
        applyStatusUpdate(id, "Rejected")
        return
      }

      const wasCapped = result && (result as any).wasCapped
      const approvedQuantity = result ? (result as any).approvedQuantity as number | undefined : undefined

      if (wasCapped && approvedQuantity != null) {
        // Only part of the requested quantity remained on the requirement —
        // approved for that smaller amount instead of the full request.
        const originalQty = donation?.quantity
        setDonations((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: "Approved", quantity: approvedQuantity, originalQuantity: originalQty } : d))
        )
        setSelectedDonation((prev) =>
          prev?.id === id ? { ...prev, status: "Approved", quantity: approvedQuantity, originalQuantity: originalQty } : prev
        )
        await createNotification({
          userId: donation?.donorId ?? "",
          title: "Donation Partially Approved",
          body: `Your donation${donation?.occasion ? ` for "${donation.occasion}"` : ""} was approved for ${approvedQuantity} ${donation?.unit || ""} — only that much remained on the requirement (you had requested ${donation?.quantity ?? approvedQuantity} ${donation?.unit || ""}).`,
          type: "donation",
        })
        return
      }

      await createNotification({
        userId: donation?.donorId ?? "",
        title: "Donation Approved",
        body: "Your donation" + (donation?.occasion ? " for \"" + donation.occasion + "\"" : "") + " has been approved by the organization.",
        type: "donation",
      })
      applyStatusUpdate(id, "Approved")
    } catch (error) {
      console.error("Failed to approve:", error)
    } finally {
      setActing(null)
    }
  }

  const handleReject = async (id: string) => {
    setActing(id)
    const donation = donations.find((d) => d.id === id)
    try {
      await updateDonationStatus(id, "Rejected")
      await createNotification({
        userId: donation?.donorId ?? "",
        title: "Donation Rejected",
        body: "Your donation" + (donation?.occasion ? " for \"" + donation.occasion + "\"" : "") + " was not accepted by the organization. You may reach out for more details.",
        type: "donation",
      })
      applyStatusUpdate(id, "Rejected")
    } catch (error) {
      console.error("Failed to reject:", error)
    } finally {
      setActing(null)
    }
  }

  const standardDonations = useMemo(
    () => donations.filter((d) => !resolveDonationType(d).isOwnItem),
    [donations]
  )
  const ownItemDonations = useMemo(
    () => donations.filter((d) => resolveDonationType(d).isOwnItem),
    [donations]
  )

  const counts = useMemo(() => {
    const result: Record<string, number> = { All: standardDonations.length }
    for (const t of tabs.slice(1)) {
      result[t.value] = standardDonations.filter((d) => d.status === t.value).length
    }
    return result
  }, [standardDonations])

  const ownItemCounts = useMemo(() => {
    const result: Record<string, number> = { All: ownItemDonations.length }
    for (const t of tabs.slice(1)) {
      result[t.value] = ownItemDonations.filter((d) => d.status === t.value).length
    }
    return result
  }, [ownItemDonations])

  const filtered = useMemo(() => {
    const list = tab === "All" ? standardDonations : standardDonations.filter((d) => d.status === tab)
    return sortDonations(list, sortBy)
  }, [standardDonations, tab, sortBy])

  const filteredOwn = useMemo(() => {
    const list = tab === "All" ? ownItemDonations : ownItemDonations.filter((d) => d.status === tab)
    return sortDonations(list, sortBy)
  }, [ownItemDonations, tab, sortBy])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  const renderDonationList = (list: DonationView[], emptyCounts: Record<string, number>) => (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Status | "All")}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 data-[state=active]:border-blue-700 data-[state=active]:bg-blue-700 data-[state=active]:text-white"
              >
                {t.label}
                <span className={"ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium " +
                  (tab === t.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600")}>
                  {emptyCounts[t.value] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
                <p className="font-semibold text-gray-900">No requests in this category</p>
                <p className="mt-1 text-sm text-gray-600">Requests will appear here once donors submit them.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {list.map((d) => (
                  <RequestCard
                    key={d.id}
                    donation={d}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    acting={acting}
                    onClick={() => setSelectedDonation(d)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  )

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-2xl font-bold text-white">Sponsorship Requests</h1>
        <p className="mt-1 leading-relaxed text-gray-600 mt-2 text-sm text-white">Review and manage donation requests from donors.</p>
      </div><br></br>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <button
          onClick={() => { setTab("All"); setMainTab("standard") }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left transition-all hover:shadow-md hover:border-gray-300 active:scale-95"
        >
          <p className="text-xs text-gray-400">Total Requests</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{donations.length}</p>
        </button>
        <button
          onClick={() => { setTab("Pending"); setMainTab("standard") }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left transition-all hover:shadow-md hover:border-amber-200 active:scale-95"
        >
          <p className="text-xs text-gray-400">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{donations.filter(d => d.status === "Pending").length}</p>
        </button>
        <button
          onClick={() => { setTab("Approved"); setMainTab("standard") }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left transition-all hover:shadow-md hover:border-green-200 active:scale-95"
        >
          <p className="text-xs text-gray-400">Approved</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{donations.filter(d => d.status === "Approved").length}</p>
        </button>
        <button
          onClick={() => { setTab("Completed"); setMainTab("standard") }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left transition-all hover:shadow-md hover:border-blue-200 active:scale-95"
        >
          <p className="text-xs text-gray-400">Completed</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{donations.filter(d => d.status === "Completed").length}</p>
        </button>
        <button
          onClick={() => { setTab("Rejected"); setMainTab("standard") }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left transition-all hover:shadow-md hover:border-red-200 active:scale-95"
        >
          <p className="text-xs text-gray-400">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{donations.filter(d => d.status === "Rejected").length}</p>
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setMainTab("standard")}
          className={"px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors " + (
            mainTab === "standard"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Sponsorship Requests
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-600">
            {standardDonations.length}
          </span>
        </button>
        <button
          onClick={() => setMainTab("ownItems")}
          className={"px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors " + (
            mainTab === "ownItems"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Own Item Donations
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-100 px-1.5 text-xs font-medium text-purple-700">
            {ownItemDonations.length}
          </span>
        </button>
      </div>

      {mainTab === "standard" ? (
        standardDonations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="font-semibold text-gray-900">No sponsorship requests yet</p>
            <p className="mt-1 text-sm text-gray-600">Requests from donors will appear here once they submit sponsorships.</p>
          </div>
        ) : renderDonationList(filtered, counts)
      ) : (
        ownItemDonations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <Gift className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="font-semibold text-gray-900">No own item donations yet</p>
            <p className="mt-1 text-sm text-gray-600">When donors offer their own items to donate, they will appear here.</p>
          </div>
        ) : renderDonationList(filteredOwn, ownItemCounts)
      )}

      <DonationDetailModal
        donation={selectedDonation}
        onClose={() => setSelectedDonation(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        acting={acting}
      />
    </div>
  )
}