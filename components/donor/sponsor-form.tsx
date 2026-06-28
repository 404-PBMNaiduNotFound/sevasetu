"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Info, CheckCircle2, Utensils, Building2, CalendarDays, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import {
  createDonation,
  getOrganization,
  getSlots,
  getMinBookableDate,
  getUser,
  getDonorSlotDonations,
  SPONSORSHIP_LEAD_TIME_DAYS,
  type OrganizationDoc,
  type SlotDoc,
} from "@/lib/firestore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

const occasions = [
  "Birthday",
  "Anniversary",
  "Corporate CSR",
  "Memorial",
  "Festival",
  "Other",
]

export function SponsorForm() {
  const { user } = useAuth()
  const params = useSearchParams()
  const orgId = params.get("org") ?? ""
  const slotId = params.get("slot") ?? undefined
  const reqId = params.get("req") ?? undefined
  const itemName = params.get("item") ?? undefined
  const unit = params.get("unit") ?? undefined
  const remainingReq = params.get("remaining") ? Number(params.get("remaining")) : null

  const [org, setOrg] = useState<OrganizationDoc | null>(null)
  const [slot, setSlot] = useState<SlotDoc | null>(null)
  const [loadingOrg, setLoadingOrg] = useState(true)
  const [occasion, setOccasion] = useState("")
  const [meals, setMeals] = useState("100")
  const [message, setMessage] = useState("")
  const [donorPhone, setDonorPhone] = useState<string>("")
  const [hasExistingSlotRequest, setHasExistingSlotRequest] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const minDate = getMinBookableDate()

  const [donationDate, setDonationDate] = useState<string>(() => {
    const paramDate = params.get("date")
    return paramDate && paramDate >= minDate ? paramDate : minDate
  })

  // Fetch donor phone from users collection
  useEffect(() => {
    if (!user?.uid) return
    getUser(user.uid).then((u) => setDonorPhone(u?.phone ?? ""))
  }, [user?.uid])

  useEffect(() => {
    if (!orgId) { setLoadingOrg(false); return }
    async function load() {
      try {
        const [orgData, slotsData] = await Promise.all([
          getOrganization(orgId),
          slotId ? getSlots({ organizationId: orgId }) : Promise.resolve([]),
        ])
        setOrg(orgData)
        if (slotId) {
          const found = (slotsData as SlotDoc[]).find(s => s.id === slotId) || null
          setSlot(found)
        }
      } catch (err) {
        console.error("Failed to load org/slot:", err)
      } finally {
        setLoadingOrg(false)
      }
    }
    load()
  }, [orgId, slotId])

  // Block duplicate/multiple bookings: if this donor already has a Pending
  // or Approved request open for this exact slot, don't let them submit
  // another one for it.
  useEffect(() => {
    if (!user?.uid || !slotId) { setHasExistingSlotRequest(false); return }
    let cancelled = false
    getDonorSlotDonations(user.uid, slotId)
      .then((existing) => {
        if (cancelled) return
        const hasOpenRequest = existing.some(
          (d) => d.status === "Pending" || d.status === "Approved"
        )
        setHasExistingSlotRequest(hasOpenRequest)
      })
      .catch((err) => {
        console.error("Failed to check existing slot requests:", err)
      })
    return () => { cancelled = true }
  }, [user?.uid, slotId])

  const meal = slot?.mealType ?? params.get("meal") ?? "Lunch"
  const date = slot?.date ?? donationDate

  const remainingMeals = slot
    ? Math.max(0, (slot.totalNeeded ?? 0) - (slot.sponsored ?? 0))
    : null
  const isFull = slot?.status === "Full"

  const slotTooSoon = !!slot && slot.date < minDate
  const isLocked = isFull || slotTooSoon || hasExistingSlotRequest

  const mealsError = useMemo(() => {
    if (slot && remainingMeals !== null) {
      const n = Number(meals)
      if (!Number.isNaN(n) && n > remainingMeals) {
        return `Only ${remainingMeals} meals remaining for this sponsorship slot.`
      }
    }
    return null
  }, [meals, slot, remainingMeals])

  const dateError =
    !slot && donationDate < minDate
      ? `Please choose a date at least ${SPONSORSHIP_LEAD_TIME_DAYS} days from today.`
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (isLocked) return
    if (hasExistingSlotRequest) return
    if (mealsError) return
    if (dateError) return
    setSubmitting(true)
    try {
      await createDonation({
        donorId: user.uid,
        donorPhone: donorPhone || "",
        organizationId: orgId,
        slotId: slotId,
        requirementId: reqId,
        // For meal-sponsorship (slot-based) donations, set itemName to "meals" so
        // the vendor search on the find-vendor page can match meal vendors.
        itemName: itemName ?? (!reqId ? "meals" : undefined),
        unit: unit ?? (!reqId ? "meals" : undefined),
        // Store which meal (Breakfast/Lunch/Dinner) this sponsorship is for,
        // so org and donor views can show it without a separate slot lookup.
        // Only set for meal-sponsorship donations, not item/requirement donations.
        mealType: !reqId ? (meal as "Breakfast" | "Lunch" | "Dinner") : undefined,
        donationDate: slot ? slot.date : (reqId ? new Date().toISOString().split("T")[0] : donationDate),
        submissionDate: new Date().toISOString().split("T")[0],
        meals: reqId ? undefined : Number(meals) || 0,
        quantity: reqId ? Number(meals) || 0 : undefined,
        amount: 0,
        occasion: occasion || "Other",
        message: message.trim(),
        status: "Pending",
      })
      setSubmitted(true)
    } catch (error) {
      console.error("Failed to create donation:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOrg) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-8" /></div>
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-foreground">Request Sent Successfully</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your sponsorship request for {org?.name || "the organization"} has been sent for approval.
          You&apos;ll be notified once the organization responds.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-xl">
            <Link href="/donor/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/donor/browse">Browse More NGOs</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={orgId ? `/donor/org/${orgId}` : "/donor/browse"}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            {reqId ? `Donate ${itemName}` : (meal ? `Sponsor ${meal}` : "Sponsor")}
            {!reqId && date ? ` – ${date}` : ""}
          </h1>
          {org && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              {org.organizationName || org.name}
            </p>
          )}

          {isLocked && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              {hasExistingSlotRequest
                ? "You already have a request for this sponsorship slot. You can't submit another one for the same slot."
                : isFull
                ? "This sponsorship slot is fully sponsored."
                : `Bookings for this slot have closed — sponsorships must be made at least ${SPONSORSHIP_LEAD_TIME_DAYS} days in advance.`}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            {!slot && !reqId && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="donation-date">Preferred Date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="donation-date"
                    type="date"
                    min={minDate}
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    disabled={isLocked}
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
                {dateError ? (
                  <p className="text-xs font-medium text-destructive">{dateError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sponsorships must be requested at least {SPONSORSHIP_LEAD_TIME_DAYS} days in advance. The organization will review and confirm your date.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="occasion">Occasion</Label>
              <Select value={occasion} onValueChange={setOccasion} disabled={isLocked}>
                <SelectTrigger id="occasion" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select an occasion" />
                </SelectTrigger>
                <SelectContent>
                  {occasions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="meals">{reqId ? `Quantity (${unit || ""})` : "Number of Meals"}</Label>
              {slot && remainingMeals !== null && (
                <p className="text-xs font-medium text-muted-foreground">
                  Remaining Meals: <span className="text-foreground">{remainingMeals}</span>
                </p>
              )}
              {reqId && remainingReq !== null && (
                <p className="text-xs font-medium text-muted-foreground">
                  Remaining Required: <span className="text-foreground">{remainingReq} {unit}</span>
                </p>
              )}
              <Input
                id="meals"
                type="number"
                min={1}
                max={slot && remainingMeals !== null ? remainingMeals : (reqId && remainingReq !== null ? remainingReq : undefined)}
                value={meals}
                onChange={(e) => setMeals(e.target.value)}
                disabled={isLocked}
                className="h-11 rounded-xl"
                placeholder="e.g. 100"
              />
              {mealsError && (
                <p className="text-xs font-medium text-destructive">{mealsError}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="message">
                Message <span className="font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                disabled={isLocked}
                className="rounded-xl"
                placeholder="I would like to sponsor lunch on the occasion of my birthday."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="submission-date">Request Date</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="submission-date"
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  readOnly
                  disabled
                  className="h-11 rounded-xl pl-9 bg-secondary"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base"
              disabled={submitting || !user || isLocked || !!mealsError || !!dateError}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Your request will be sent to the organization for approval.
            </p>
          </form>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">Sponsorship Summary</h2>
          {org && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary font-bold text-lg">
                {(org.organizationName || org.name || "O")[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{org.organizationName || org.name}</p>
                <p className="text-xs text-muted-foreground">{org.city}, {org.state}</p>
              </div>
            </div>
          )}

          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {reqId ? (
              <>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Utensils className="h-4 w-4 text-primary" />Item</span>
                  <span className="font-semibold text-foreground">{itemName}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />Quantity</span>
                  <span className="font-semibold text-foreground">{meals} {unit}</span>
                </li>
              </>
            ) : (
              <>
                {meal && (
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground"><Utensils className="h-4 w-4 text-primary" />Meal</span>
                    <span className="font-semibold text-foreground">{meal}</span>
                  </li>
                )}
                {date && (
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Date</span>
                    <span className="font-semibold text-foreground">{date}</span>
                  </li>
                )}
              </>
            )}
          </ul>
        </aside>
      </div>
    </div>
  )
}