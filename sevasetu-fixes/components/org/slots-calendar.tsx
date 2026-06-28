"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, X, Clock, CalendarDays, Trash2, Pencil, Check, Ban, Users, Phone, Mail, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import {
  addSlot,
  deleteSlot,
  getMySlots,
  updateSlot,
  getOrganization,
  getPendingDonorRequests,
  getDonationsBySlot,
  getUser,
  approveDonationWithFulfillment,
  updateDonationStatus,
  type SlotDoc,
  type DonationDoc,
  type UserDoc,
} from "@/lib/firestore"

type DaySlotInfo = {
  id?: string
  mealType: string
  totalNeeded: number
  sponsored: number
  status: SlotDoc["status"]
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"] as const

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  return { year, month, day }
}

function computeSlotStatus(sponsored: number, totalNeeded: number): SlotDoc["status"] {
  if (totalNeeded > 0 && sponsored >= totalNeeded) return "Full"
  if (sponsored > 0) return "Partially Filled"
  return "Available"
}

function slotsToDayMap(slots: SlotDoc[], year: number, month: number): Record<number, DaySlotInfo[]> {
  const map: Record<number, DaySlotInfo[]> = {}
  for (const slot of slots) {
    const { year: slotYear, month: slotMonth, day } = parseIsoDate(slot.date)
    if (slotYear !== year || slotMonth !== month) continue
    if (!map[day]) map[day] = []
    map[day].push({
      id: slot.id,
      mealType: slot.mealType ?? "Lunch",
      totalNeeded: slot.totalNeeded,
      sponsored: slot.sponsored,
      status: slot.status,
    })
  }
  return map
}

function statusBadgeClass(status: SlotDoc["status"]) {
  switch (status) {
    case "Full":             return "bg-blue-100 text-blue-700"
    case "Partially Filled": return "bg-amber-100 text-amber-700"
    default:                 return "bg-green-100 text-green-700"
  }
}

function statusDotClass(status: SlotDoc["status"]) {
  switch (status) {
    case "Full":             return "bg-primary"
    case "Partially Filled": return "bg-amber-500"
    default:                 return "bg-green-500"
  }
}

function todayIso() {
  const now = new Date()
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function twoDaysAfterIso() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

type SlotForm = {
  date: string
  mealType: NonNullable<SlotDoc["mealType"]>
  totalNeeded: string
  description: string
  mealsCount: string
}

const defaultForm = (): SlotForm => ({
  date: twoDaysAfterIso(),
  mealType: "Lunch",
  totalNeeded: "",
  description: "",
  mealsCount: "",
})

// ── Donor Details Modal ──────────────────────────────────────────────────────

type DonorEntry = {
  donation: DonationDoc
  donor: UserDoc | null
}

function DonorDetailsModal({
  slot,
  onClose,
}: {
  slot: SlotDoc | null
  onClose: () => void
}) {
  const [donors, setDonors] = useState<DonorEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slot?.id) return
    setLoading(true)
    getDonationsBySlot(slot.id, slot.organizationId)
      .then(async (donations) => {
        const entries = await Promise.all(
          donations.map(async (d) => ({
            donation: d,
            donor: await getUser(d.donorId).catch(() => null),
          }))
        )
        setDonors(entries)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [slot?.id])

  useEffect(() => {
    if (!slot) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [slot, onClose])

  if (!slot) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{slot.title}</p>
              <p className="text-xs text-muted-foreground">{slot.date} · {slot.mealType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {Math.min(slot.sponsored, slot.totalNeeded)}/{slot.totalNeeded} meals sponsored
            </span>
            <Badge className={cn("rounded-full text-[10px]", statusBadgeClass(slot.status))}>
              {slot.status}
            </Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : donors.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No approved donations found for this slot.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {donors.map(({ donation, donor }, i) => (
                <div
                  key={donation.id ?? i}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {(donor?.name || "D").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{donor?.name ?? "Unknown Donor"}</p>
                      {donor?.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="break-all">{donor.email}</span>
                        </p>
                      )}
                      {(donation.donorPhone || donor?.phone) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {donation.donorPhone || donor?.phone}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">{donation.meals ?? 0} meals</p>
                      <span className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                        donation.status === "Completed" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      )}>
                        {donation.status}
                      </span>
                    </div>
                  </div>
                  {donation.occasion && (
                    <p className="mt-1.5 text-xs text-muted-foreground pl-12">{donation.occasion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SlotsCalendar() {
  const { user } = useAuth()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [slots, setSlots] = useState<SlotDoc[]>([])
  const [pendingRequests, setPendingRequests] = useState<DonationDoc[]>([])
  const [beneficiaries, setBeneficiaries] = useState<number | null>(null)
  const [orgCover, setOrgCover] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actingOnId, setActingOnId] = useState<string | null>(null)
  const [approveMessage, setApproveMessage] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<SlotDoc | null>(null)
  const [form, setForm] = useState<SlotForm>(defaultForm())
  const [donorDetailsSlot, setDonorDetailsSlot] = useState<SlotDoc | null>(null)

  const loadSlots = useCallback(async () => {
    if (!user?.uid) {
      setSlots([])
      setPendingRequests([])
      setBeneficiaries(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [slotsData, pendingData, orgData] = await Promise.all([
        getMySlots(user.uid),
        getPendingDonorRequests(user.uid),
        getOrganization(user.uid),
      ])
      setSlots(slotsData)
      setPendingRequests(pendingData)
      setBeneficiaries(orgData?.beneficiaries ?? null)
      setOrgCover(orgData?.photoURLs?.[0] ?? null)
      setOrgName(orgData?.organizationName ?? orgData?.name ?? "")
    } catch (error) {
      console.error("Failed to load slots:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => { loadSlots() }, [loadSlots])

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth, 0).getDate(),
    [viewYear, viewMonth],
  )

  const leadingBlanks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1
  }, [viewYear, viewMonth])

  const today = useMemo(() => parseIsoDate(todayIso()), [])

  const slotData = useMemo(
    () => slotsToDayMap(slots, viewYear, viewMonth),
    [slots, viewYear, viewMonth],
  )

  const pendingDays = useMemo(() => {
    const days = new Set<number>()
    for (const req of pendingRequests) {
      if (!req.donationDate) continue
      const { year, month, day } = parseIsoDate(req.donationDate)
      if (year === viewYear && month === viewMonth) days.add(day)
    }
    return days
  }, [pendingRequests, viewYear, viewMonth])

  const cells: (number | null)[] = useMemo(
    () => [
      ...Array(leadingBlanks).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ],
    [leadingBlanks, daysInMonth],
  )

  const selectedDaySlots = useMemo(() => {
    if (!selectedDate) return []
    return slots.filter((slot) => slot.date === selectedDate)
  }, [slots, selectedDate])

  const selectedDayPendingRequests = useMemo(() => {
    if (!selectedDate) return []
    return pendingRequests.filter((req) => req.donationDate === selectedDate)
  }, [pendingRequests, selectedDate])

  const selectedDaySummary = useMemo(() => {
    const totals = selectedDaySlots.reduce(
      (acc, slot) => {
        const safeSponsored = Math.min(slot.sponsored, slot.totalNeeded)
        acc.sponsored += safeSponsored
        acc.totalNeeded += slot.totalNeeded
        return acc
      },
      { sponsored: 0, totalNeeded: 0 },
    )
    const percent =
      totals.totalNeeded > 0
        ? Math.min(100, Math.round((totals.sponsored / totals.totalNeeded) * 100))
        : 0
    return { ...totals, percent }
  }, [selectedDaySlots])

  // Whether the selected date already has all 3 meal types
  const selectedDateAllSlotsFilled = useMemo(() => {
    if (!selectedDate) return false
    const existingTypes = new Set(
      slots.filter((s) => s.date === selectedDate).map((s) => s.mealType ?? "Lunch")
    )
    return MEAL_TYPES.every((mt) => existingTypes.has(mt))
  }, [selectedDate, slots])

  const isInactiveDay = selectedDate !== null && selectedDate < twoDaysAfterIso()

  function openAdd() {
    setEditingSlot(null)
    setForm({
      ...defaultForm(),
      date: selectedDate && selectedDate >= twoDaysAfterIso() ? selectedDate : twoDaysAfterIso(),
      totalNeeded: beneficiaries != null ? String(beneficiaries) : "",
    })
    setDialogOpen(true)
  }

  function openEdit(slot: SlotDoc) {
    setEditingSlot(slot)
    setForm({
      date: slot.date,
      mealType: slot.mealType ?? "Lunch",
      totalNeeded: slot.totalNeeded > 0 ? String(slot.totalNeeded) : "",
      description: slot.description ?? "",
      mealsCount: slot.mealsCount ? String(slot.mealsCount) : "",
    })
    setDialogOpen(true)
  }

  const slotDateError =
    form.date && form.date < twoDaysAfterIso() ? "You can't add a slot before 2 days from today." : null

  async function handleDelete(slotId: string) {
    try {
      await deleteSlot(slotId)
      await loadSlots()
    } catch (error) {
      console.error("Failed to delete slot:", error)
    }
  }

  async function handleApprovePending(donationId: string) {
    setActingOnId(donationId)
    setApproveMessage(null)
    try {
      const result = await approveDonationWithFulfillment(donationId)
      if (result && (result as any).rejected) {
        // The slot/requirement was already full or this would have
        // overbooked it — the donation was auto-rejected instead of
        // approved to prevent a duplicate/overlapping booking.
        setApproveMessage((result as any).reason as string)
      } else if (result && (result as any).wasCapped) {
        const approvedQuantity = (result as any).approvedQuantity
        setApproveMessage(`Only part of this request could be approved (${approvedQuantity} of what was requested) — the rest had already been fulfilled by other donors.`)
      }
      await loadSlots()
    } catch (error) {
      console.error("Failed to approve pending request:", error)
    } finally {
      setActingOnId(null)
    }
  }

  async function handleRejectPending(donationId: string) {
    setActingOnId(donationId)
    try {
      await updateDonationStatus(donationId, "Rejected")
      await loadSlots()
    } catch (error) {
      console.error("Failed to reject pending request:", error)
    } finally {
      setActingOnId(null)
    }
  }

  async function handleSave() {
    if (!user?.uid) return
    if (slotDateError) return

    const totalNeeded = form.totalNeeded === "" ? 0 : Number(form.totalNeeded)

    if (editingSlot?.id) {
      const rawSponsored = editingSlot.sponsored ?? 0
      const sponsored = totalNeeded > 0 ? Math.min(rawSponsored, totalNeeded) : 0
      const status = computeSlotStatus(sponsored, totalNeeded)
      const title = `${form.mealType} · ${form.date}`

      const payload: Omit<SlotDoc, "id"> = {
        organizationId: user.uid,
        title,
        description: form.description.trim() || "",
        date: form.date,
        mealType: form.mealType,
        totalNeeded,
        sponsored,
        status,
        mealsCount: form.mealsCount ? Number(form.mealsCount) : totalNeeded,
      }

      setSaving(true)
      try {
        await updateSlot(editingSlot.id, payload)
        setDialogOpen(false)
        await loadSlots()
      } catch (error) {
        console.error("Failed to save slot:", error)
      } finally {
        setSaving(false)
      }
      return
    }

    const existingTypesForDate = new Set(
      slots.filter((s) => s.date === form.date).map((s) => s.mealType ?? "Lunch"),
    )
    const mealTypesToCreate = MEAL_TYPES.filter((mt) => !existingTypesForDate.has(mt))

    if (mealTypesToCreate.length === 0) {
      setDialogOpen(false)
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        mealTypesToCreate.map((mealType) => {
          const payload: Omit<SlotDoc, "id"> = {
            organizationId: user.uid,
            title: `${mealType} · ${form.date}`,
            description: form.description.trim() || "",
            date: form.date,
            mealType,
            totalNeeded,
            sponsored: 0,
            status: computeSlotStatus(0, totalNeeded),
            mealsCount: totalNeeded,
          }
          return addSlot(payload)
        }),
      )
      setDialogOpen(false)
      await loadSlots()
    } catch (error) {
      console.error("Failed to save slots:", error)
    } finally {
      setSaving(false)
    }
  }

  function selectDay(day: number) {
    setSelectedDate(toIsoDate(viewYear, viewMonth, day))
  }

  const selectedDayLabel = selectedDate
    ? (() => {
        const { day } = parseIsoDate(selectedDate)
        return `${day} ${monthNames[viewMonth - 1]} ${viewYear}`
      })()
    : ""

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Page header: solid blue banner (no image — cover photo lives as a watermark behind the calendar grid below) ── */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-primary px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white sm:h-12 sm:w-12">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div>
            {/* FIX: Page heading scales with viewport */}
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl lg:text-2xl">
              Sponsorship Slots
            </h1>
            <p className="mt-0.5 text-xs text-primary-foreground/80 sm:text-sm">
              {monthNames[viewMonth - 1]} {viewYear} · Manage meal sponsorship availability
            </p>
          </div>
        </div>
        {/* Hide Add Slot when selected date already has all 3 meal types */}
        {!selectedDateAllSlotsFilled && (
          <Button
            onClick={openAdd}
            className="w-full gap-2 rounded-xl bg-white text-primary hover:bg-white/90 shadow sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Calendar grid ── */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Faded org-cover background, behind everything in this card */}
          {orgCover && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `url(${orgCover})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0,
                }}
              />
              {/* Light wash on top, just enough to keep grid lines/text crisp */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-white/30"
              />
            </>
          )}

          <div className="relative p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-8" />
            </div>
          ) : (
            <>
              {/* Month navigation */}
              <div className="mb-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12) }
                    else { setViewMonth((m) => m - 1) }
                    setSelectedDate(null)
                  }}
                >
                  Prev
                </Button>
                {/* FIX: Month/year heading is responsive */}
                <span className="text-xs font-semibold text-foreground sm:text-sm lg:text-base">
                  {monthNames[viewMonth - 1]} {viewYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1) }
                    else { setViewMonth((m) => m + 1) }
                    setSelectedDate(null)
                  }}
                >
                  Next
                </Button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 lg:gap-2">
                {/* FIX: Weekday headers — single letter on mobile, abbreviated on sm+ */}
                {weekdays.map((d) => (
                  <div
                    key={d}
                    className="pb-1 text-center text-[9px] font-semibold uppercase text-muted-foreground sm:pb-2 sm:text-[10px] lg:text-xs"
                  >
                    <span className="sm:hidden">{d[0]}</span>
                    <span className="hidden sm:inline">{d}</span>
                  </div>
                ))}

                {cells.map((day, idx) => {
                  if (day === null) return <div key={`blank-${idx}`} className="aspect-square" />
                  const daySlots = slotData[day]
                  const dateKey = toIsoDate(viewYear, viewMonth, day)
                  const isToday =
                    today.year === viewYear && today.month === viewMonth && today.day === day

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        // FIX: cell padding and border-radius scale with breakpoints
                        "flex aspect-square flex-col rounded-lg border border-gray-100 bg-white/70 p-0.5 text-left transition-colors hover:border-primary/40 hover:bg-blue-50/50 sm:rounded-xl sm:p-1.5 lg:p-2",
                        selectedDate === dateKey && "border-primary ring-1 ring-primary",
                      )}
                    >
                      {/* FIX: day number circle scales with breakpoints */}
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full font-semibold sm:h-5 sm:w-5 lg:h-6 lg:w-6",
                          "text-[9px] sm:text-[10px] lg:text-xs",
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {day}
                      </span>

                      {/* Slot indicators: xs/sm = dots only; lg = dot + fraction */}
                      {(daySlots && daySlots.length > 0) && (
                        <div className="mt-auto flex flex-col gap-0.5">
                          {daySlots.map((info, i) => (
                            <span
                              key={info.id ?? i}
                              className="flex items-center gap-0.5"
                            >
                              <span
                                className={cn(
                                  "h-1 w-1 shrink-0 rounded-full sm:h-1.5 sm:w-1.5",
                                  statusDotClass(info.status),
                                )}
                              />
                              {/* Show fraction only on lg */}
                              <span className="hidden text-[9px] lg:inline lg:text-[10px] text-muted-foreground">
                                {info.mealType[0]}·{Math.min(info.sponsored, info.totalNeeded)}/{info.totalNeeded}
                              </span>
                              {/* On sm–md show just the meal initial */}
                              <span className="text-[9px] sm:text-[9px] lg:hidden">
                                {info.mealType[0]}
                              </span>
                            </span>
                          ))}
                          {pendingDays.has(day) && (
                            <span className="flex items-center gap-0.5 text-violet-600">
                              <span className="h-1 w-1 shrink-0 rounded-full bg-violet-500 sm:h-1.5 sm:w-1.5" />
                              <span className="hidden text-[9px] lg:inline">Req</span>
                            </span>
                          )}
                        </div>
                      )}
                      {(!daySlots || daySlots.length === 0) && pendingDays.has(day) && (
                        <div className="mt-auto flex flex-col gap-0.5">
                          <span className="flex items-center gap-0.5 text-violet-600">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-violet-500 sm:h-1.5 sm:w-1.5" />
                            <span className="hidden text-[9px] lg:inline">Req</span>
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* FIX: Legend — responsive size and wrapping */}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-3 sm:mt-5 sm:gap-4 sm:pt-4">
                {[
                  { color: "bg-green-500",  label: "Available" },
                  { color: "bg-amber-500",  label: "Partial"   },
                  { color: "bg-primary",    label: "Filled"    },
                  { color: "bg-violet-500", label: "Request"   },
                ].map(({ color, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground sm:gap-1.5 sm:text-xs"
                  >
                    <span className={cn("h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5", color)} />
                    {label}
                  </span>
                ))}
                <span className="ml-auto hidden text-xs text-muted-foreground lg:block">
                  B = Breakfast · L = Lunch · D = Dinner
                </span>
              </div>
            </>
          )}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        {selectedDate !== null && (
          <div className="w-full shrink-0 rounded-2xl border border-gray-100 bg-white shadow-sm lg:w-80">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h2 className="font-semibold text-foreground">{selectedDayLabel}</h2>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  {selectedDaySummary.sponsored}/{selectedDaySummary.totalNeeded || 0} Meals Sponsored
                </span>
                <span className="text-muted-foreground">{selectedDaySummary.percent}%</span>
              </div>
              <Progress value={selectedDaySummary.percent} className="mt-2 h-2 [&>div]:bg-green-500" />
            </div>

            <div className="max-h-[480px] space-y-3 overflow-y-auto p-4">
              {isInactiveDay ? (
                <div className="space-y-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meal Counts
                  </p>
                  {selectedDaySlots.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No slots for this day.</p>
                  ) : (
                    selectedDaySlots.map((slot) => {
                      const prefix = slot.mealType === "Breakfast" ? "b:" : slot.mealType === "Lunch" ? "l:" : "d:"
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setDonorDetailsSlot(slot)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl border p-3 text-sm font-semibold text-left transition-colors hover:brightness-95",
                            slot.status === "Full"
                              ? "border-blue-100 bg-blue-50/50 text-blue-700"
                              : slot.status === "Partially Filled"
                              ? "border-amber-100 bg-amber-50/50 text-amber-700"
                              : "border-green-100 bg-green-50/50 text-green-700",
                          )}
                        >
                          <span>{slot.mealType}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono">
                              {prefix}{Math.min(slot.sponsored, slot.totalNeeded)}/{slot.totalNeeded}
                            </span>
                            {(slot.status === "Full" || slot.status === "Partially Filled") && (
                              <span className="text-[10px] font-medium opacity-70">View donors</span>
                            )}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : (
                <>
                  {approveMessage && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{approveMessage}</span>
                      <button
                        type="button"
                        onClick={() => setApproveMessage(null)}
                        className="shrink-0 text-amber-600 hover:text-amber-800"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {selectedDayPendingRequests.length > 0 && (
                    <div className="space-y-3">
                      {selectedDayPendingRequests.map((req) => (
                        <div key={req.id} className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-foreground">
                              Donor Request{req.meals ? ` · ${req.meals} meals` : ""}
                            </p>
                            <Badge variant="secondary" className="rounded-full bg-violet-100 text-[10px] text-violet-700">
                              Pending
                            </Badge>
                          </div>
                          {req.occasion && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{req.occasion}</p>
                          )}
                          {req.message && (
                            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{req.message}</p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                              disabled={actingOnId === req.id}
                              onClick={() => req.id && handleApprovePending(req.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 rounded-lg"
                              disabled={actingOnId === req.id}
                              onClick={() => req.id && handleRejectPending(req.id)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDaySlots.length === 0 ? (
                    selectedDayPendingRequests.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No slots for this day. Add one to open it for sponsorship.
                      </p>
                    )
                  ) : (
                    selectedDaySlots.map((slot) => (
                      <div key={slot.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold text-foreground">{slot.title}</p>
                              <Badge
                                variant="secondary"
                                className={cn("rounded-full text-[10px]", statusBadgeClass(slot.status))}
                              >
                                {slot.status}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {slot.mealType ?? "Lunch"} · {Math.min(slot.sponsored, slot.totalNeeded)}/{slot.totalNeeded} meals
                            </p>
                            {slot.description && (
                              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{slot.description}</p>
                            )}
                            {/* View donors link for slots with donations */}
                            {(slot.status === "Full" || slot.status === "Partially Filled") && (
                              <button
                                type="button"
                                onClick={() => setDonorDetailsSlot(slot)}
                                className="mt-2 text-xs font-medium text-primary hover:underline"
                              >
                                View donor details →
                              </button>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(slot)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-50 hover:text-primary"
                              aria-label={`Edit ${slot.title}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => slot.id && handleDelete(slot.id)}
                              disabled={!slot.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-50"
                              aria-label={`Delete ${slot.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* "Add Slot for This Day" — hidden when inactive or all 3 slots exist */}
            {!isInactiveDay && !selectedDateAllSlotsFilled && (
              <div className="border-t border-gray-100 p-4">
                <Button
                  onClick={openAdd}
                  className="w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Slot for This Day
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlot ? "Edit Slot" : "Add Sponsorship Slot"}</DialogTitle>
            <DialogDescription>
              {editingSlot
                ? "Update the details for this slot."
                : "Creates Breakfast, Lunch, and Dinner slots for this date in one go, each needing the meal count below."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slot-date">Date</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="slot-date"
                  type="date"
                  min={twoDaysAfterIso()}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="rounded-xl pl-9"
                />
              </div>
              {slotDateError && (
                <p className="text-xs font-medium text-destructive">{slotDateError}</p>
              )}
            </div>

            {editingSlot && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meal-type">Meal Type</Label>
                <Select
                  value={form.mealType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, mealType: v as NonNullable<SlotDoc["mealType"]> }))
                  }
                >
                  <SelectTrigger id="meal-type" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total-meals">
                {editingSlot ? "Total Meals Needed" : "Meals Needed (per meal type)"}
              </Label>
              <Input
                id="total-meals"
                type="number"
                min={0}
                value={form.totalNeeded}
                onChange={(e) => setForm((f) => ({ ...f, totalNeeded: e.target.value }))}
                placeholder="100"
                className="rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slot-desc">Description (optional)</Label>
              <Textarea
                id="slot-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add any notes about this slot..."
                className="min-h-20 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={saving}
            >
              <Clock className="h-4 w-4" />
              {saving ? "Saving..." : editingSlot ? "Update Slot" : "Save Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Donor Details Modal ── */}
      <DonorDetailsModal
        slot={donorDetailsSlot}
        onClose={() => setDonorDetailsSlot(null)}
      />
    </div>
  )
}