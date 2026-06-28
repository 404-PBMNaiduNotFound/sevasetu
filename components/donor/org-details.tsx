"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Users,
  CalendarDays,
  Mail,
  Phone,
  Globe,
  BadgeCheck,
  Heart,
  Share2,
  AlertCircle,
  ImageOff,
  Package,
  Send,
  CheckCircle2,
  Loader2,
  Gift,
  CreditCard,
} from "lucide-react"
import {
  getSlots,
  getMyRequirements,
  createOwnItemDonation,
  toggleFavoriteOrg,
  getFavoriteOrgIds,
  type OrganizationDoc,
  type SlotDoc,
  type RequirementDoc,
} from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const priorityStyles: Record<string, string> = {
  High: "bg-danger-soft text-destructive",
  Medium: "bg-warning-soft text-warning",
  Low: "bg-info-soft text-info",
}

const UNITS = ["kg", "L", "pieces", "packets", "boxes", "other"]

// ── Cover background when no photo ──────────────────────────────────────────

function CoverFallback({ orgName }: { orgName: string }) {
  const initials = orgName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div
      className="h-full w-full flex items-end"
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 40%, #1a5276 70%, #154360 100%)",
      }}
    >
      {/* Decorative calendar grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[80px] font-black text-white/10 select-none">{initials}</span>
      </div>
    </div>
  )
}

// ── Own Item Donation Form ───────────────────────────────────────────────────

// ── Main Component ───────────────────────────────────────────────────────────

export function OrgDetails({ org }: { org: OrganizationDoc }) {
  const { user } = useAuth()
  const [favorite, setFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [slots, setSlots] = useState<SlotDoc[]>([])
  const [requirements, setRequirements] = useState<RequirementDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Load initial favourite state
  useEffect(() => {
    if (!user?.uid) return
    const orgId = org.orgId || org.uid
    getFavoriteOrgIds(user.uid).then((ids) => {
      setFavorite(ids.includes(orgId))
    }).catch(console.error)
  }, [user?.uid, org.orgId, org.uid])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [slotsData, reqsData] = await Promise.all([
          getSlots({ organizationId: org.orgId || org.uid }),
          getMyRequirements(org.orgId || org.uid || "")
        ])
        const minDate = new Date()
        minDate.setDate(minDate.getDate() + 2)
        const minDateStr = minDate.toISOString().split("T")[0]
        const filteredSlots = slotsData.filter((s) => s.date >= minDateStr)
        setSlots(filteredSlots)
        setRequirements(reqsData)
      } catch (error) {
        console.error("Failed to load org secondary data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [org.orgId, org.uid])

  const handleToggleFavorite = async () => {
    if (!user?.uid) return
    setFavLoading(true)
    try {
      const newState = await toggleFavoriteOrg(user.uid, org.orgId || org.uid)
      setFavorite(newState)
    } catch (error) {
      console.error("Failed to toggle favourite:", error)
    } finally {
      setFavLoading(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/donor/browse/${org.orgId || org.uid}`
    const title = org.organizationName || org.name || "Organization"
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // User cancelled or error, fall back to clipboard
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch {
        // Clipboard not available
      }
    }
  }

  // Group slots by date for the calendar view
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, SlotDoc[]>)

  const sortedDates = Object.keys(groupedSlots).sort()

  const gallery = org.photoURLs ?? []
  const hasCover = gallery.length > 0

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/donor/browse"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      {/* Cover */}
      <div className="relative h-56 w-full overflow-hidden rounded-2xl md:h-72">
        {hasCover ? (
          <img
            src={gallery[0]}
            alt={`${org.organizationName || org.name} cover`}
            className="h-full w-full object-contain"
          />
        ) : (
          <CoverFallback orgName={org.organizationName || org.name || "NGO"} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
        {org.verified && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground shadow-sm">
            <BadgeCheck className="h-4 w-4" />
            Registered Organization
          </span>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
          <div className="text-card">
            <h1 className="text-2xl font-bold text-white md:text-3xl">{org.organizationName || org.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="h-4 w-4" />
              {org.city}{org.state ? `, ${org.state}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading || !user?.uid}
              aria-pressed={favorite}
              aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-destructive disabled:opacity-60"
            >
              <Heart
                className="h-5 w-5 transition-colors"
                fill={favorite ? "var(--destructive)" : "none"}
                color={favorite ? "var(--destructive)" : "currentColor"}
              />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share this organization"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
              title={shareSuccess ? "Link copied!" : "Share"}
            >
              {shareSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Users} label="Beneficiaries" value={(org.beneficiaries || 0).toLocaleString("en-IN")} />
        <StatTile icon={CalendarDays} label="Founded" value={String(org.founded || "—")} />
        <StatTile icon={BadgeCheck} label="Type" value={org.category} />
        <StatTile icon={Heart} label="Location" value={org.city ?? "—"} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="slots" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-secondary p-1">
          <TabsTrigger value="about" className="rounded-lg">About Us</TabsTrigger>
          <TabsTrigger value="slots" className="rounded-lg">Sponsorship Slots</TabsTrigger>
          <TabsTrigger value="requirements" className="rounded-lg">Requirements</TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-lg">Gallery</TabsTrigger>
          <TabsTrigger value="own-items" className="rounded-lg">Own Item Donation</TabsTrigger>
        </TabsList>

        {/* About */}
        <TabsContent value="about" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-bold text-foreground">About {org.organizationName || org.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{org.description}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
              <ul className="mt-4 flex flex-col gap-4 text-sm">
                <ContactRow icon={Mail} label="Email" value={org.email || ""} href={`mailto:${org.email}`} />
                <ContactRow icon={Phone} label="Phone" value={org.phone || ""} href={`tel:${org.phone}`} />
                <ContactRow icon={Globe} label="Website" value={org.website || ""} href={`https://${org.website}`} />
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Slots */}
        <TabsContent value="slots" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">Sponsorship Slots</h2>
              <p className="text-sm text-muted-foreground">Select a date to provide meals for our beneficiaries.</p>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center"><Spinner /></div>
            ) : sortedDates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No slots currently available for sponsorship.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {sortedDates.map((date) => (
                  <div key={date} className="rounded-xl border border-border">
                    <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-2.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">{date}</span>
                    </div>

                    <ul className="divide-y divide-border">
                      {groupedSlots[date].map((slot) => {
                        const pct = Math.round(((slot.sponsored || 0) / (slot.totalNeeded || 1)) * 100)
                        const full = (slot.sponsored || 0) >= (slot.totalNeeded || 1)
                        return (
                          <li key={slot.id} className="grid grid-cols-2 items-center gap-3 px-4 py-3 md:grid-cols-12">
                            <span className="col-span-1 font-semibold text-foreground md:col-span-3">{slot.mealType}</span>
                            <span className="col-span-1 md:col-span-3">
                              <SlotStatusBadge status={full ? "Full" : pct > 0 ? "Partially Filled" : "Available"} />
                            </span>
                            <div className="col-span-1 md:col-span-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn("h-full rounded-full", full ? "bg-muted-foreground" : pct > 0 ? "bg-warning" : "bg-success")}
                                    style={{ width: `${Math.max(pct, 4)}%` }}
                                  />
                                </div>
                                <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                                  {slot.sponsored || 0}/{slot.totalNeeded}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-1 flex justify-end md:col-span-2">
                              {full ? (
                                <Button size="sm" variant="outline" disabled className="rounded-lg">Full</Button>
                              ) : (
                                <Button asChild size="sm" className="rounded-lg">
                                  <Link href={`/donor/sponsor?org=${org.orgId || org.uid}&slot=${slot.id}`}>Sponsor Now</Link>
                                </Button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Requirements */}
        <TabsContent value="requirements" className="mt-6">
          {loading ? (
            <div className="py-12 flex justify-center"><Spinner /></div>
          ) : requirements.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                <AlertCircle className="h-7 w-7" />
              </span>
              <div>
                <p className="font-semibold text-foreground">No requirements listed</p>
                <p className="mt-1 text-sm text-muted-foreground">This organization has no urgent requirements at the moment.</p>
              </div>
              <Button asChild className="rounded-xl">
                <Link href={`/donor/sponsor?org=${org.orgId || org.uid}`}>Sponsor a Meal Slot Instead</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {requirements.map((req) => {
                const fulfilled = req.fulfilledQuantity ?? 0
                const total = req.totalQuantity ?? 0
                const remaining = Math.max(0, total - fulfilled)
                const pct = total > 0 ? Math.min(100, Math.round((fulfilled / total) * 100)) : 0
                const isFulfilled = fulfilled >= total && total > 0

                return (
                  <div key={req.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                        <AlertCircle className="h-5 w-5" />
                      </span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityStyles[req.priority])}>
                        {req.priority} Priority
                      </span>
                    </div>
                    <h3 className="mt-4 font-bold text-foreground">{req.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{req.description}</p>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Need: {total} {req.unit}</span>
                        <span>Received: {fulfilled}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isFulfilled ? "bg-green-500" : pct > 0 ? "bg-amber-500" : "bg-red-400"
                          )}
                          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                        <span>{pct}% fulfilled</span>
                        <span className={cn("font-medium", isFulfilled ? "text-green-600" : "text-amber-600")}>
                          {isFulfilled ? "✓ Completed" : `${remaining} ${req.unit} remaining`}
                        </span>
                      </div>
                    </div>

                    {/* Action button — no "Sponsor a Slot" when fulfilled */}
                    <div className="mt-4 border-t border-border pt-4 space-y-2">
                      {isFulfilled ? (
                        <Button size="sm" variant="outline" disabled className="w-full rounded-lg opacity-60">
                          Fully Fulfilled
                        </Button>
                      ) : (
                        <>
                          <Button asChild size="sm" className="w-full rounded-lg">
                            <Link
                              href={`/donor/sponsor?org=${org.orgId || org.uid}&req=${req.id}&unit=${encodeURIComponent(req.unit)}&item=${encodeURIComponent(req.title)}&remaining=${remaining}`}
                            >
                              Donate Now
                            </Link>
                          </Button>
                          {/* Direct item purchase via Razorpay — only offered when the
                              organization has set a per-unit price on this requirement. */}
                          {!!req.pricePerUnit && (
                            <Button asChild size="sm" variant="outline" className="w-full rounded-lg gap-2">
                              <Link href={`/donor/checkout/${req.id}`}>
                                <CreditCard className="h-4 w-4" />
                                Buy & Pay Online
                              </Link>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Gallery */}
        <TabsContent value="gallery" className="mt-6">
          {gallery.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                <ImageOff className="h-7 w-7" />
              </span>
              <div>
                <p className="font-semibold text-foreground">No gallery images yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This organization hasn&apos;t uploaded any photos yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.map((src, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <img
                    src={src}
                    alt={`${org.organizationName || org.name} photo ${i + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Own Item Donation */}
        <TabsContent value="own-items" className="mt-6">
          <div className="max-w-xl">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">Own Item Donations</h2>
              <p className="text-sm text-muted-foreground">
                You can donate items you have at home — blankets, food, clothes, books, etc. The organization will review and confirm the donation.
              </p>
            </div>
            {user?.uid ? (
              <OwnItemForm org={org} donorId={user.uid} />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-semibold text-foreground">Sign in to donate</p>
                <p className="mt-1 text-sm text-muted-foreground">You need to be signed in to submit a donation request.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 truncate text-base font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <a href={href} className="truncate text-sm font-medium text-foreground hover:text-primary">
          {value || "Not provided"}
        </a>
      </div>
    </li>
  )
}

const slotStatusStyles: Record<"Full" | "Partially Filled" | "Available", string> = {
  Full: "bg-gray-100 text-gray-600",
  "Partially Filled": "bg-amber-100 text-amber-700",
  Available: "bg-green-100 text-green-700",
}

function SlotStatusBadge({ status }: { status: "Full" | "Partially Filled" | "Available" }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${slotStatusStyles[status]}`}>
      {status}
    </span>
  )
}

// ── Own Item Donation Form ───────────────────────────────────────────────────
// Drop-in replacement for OwnItemForm in org-details.tsx
// Changes: added "donationDate" field defaulting to today; passed to createOwnItemDonation

function OwnItemForm({ org, donorId }: { org: OrganizationDoc; donorId: string }) {
  const today = new Date().toISOString().split("T")[0]
const tomorrowDate = new Date()
tomorrowDate.setDate(tomorrowDate.getDate() + 1)
const tomorrow = tomorrowDate.toISOString().split("T")[0]

  const [form, setForm] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    message: "",
    donationDate: tomorrow,          // ← NEW: defaults to today
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.itemName.trim()) { setError("Please enter an item name."); return }
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) { setError("Please enter a valid quantity."); return }
    if (!form.donationDate) { setError("Please select a date."); return }
    setError(null)
    setSubmitting(true)
    try {
      await createOwnItemDonation({
        donorId,
        organizationId: org.orgId || org.uid,
        itemName: form.itemName.trim(),
        quantity: qty,
        unit: form.unit,
        message: form.message.trim() || undefined,
        occasion: undefined,
        submissionDate: form.donationDate,   // ← NEW: pass selected date
      })
      setSubmitted(true)
      setForm({ itemName: "", quantity: "", unit: "kg", message: "", donationDate: tomorrow })
    } catch (err) {
      setError("Failed to submit. Please try again.")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-foreground">Donate Your Own Items</h3>
          <p className="text-xs text-muted-foreground">Offer items directly to this organization.</p>
        </div>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="font-semibold text-foreground">Donation request submitted!</p>
          <p className="text-sm text-muted-foreground">The organization will review and approve your donation.</p>
          <Button variant="outline" className="mt-2 rounded-xl" onClick={() => setSubmitted(false)}>
            Submit Another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Item Name */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Blankets, Rice, Books..."
                className="h-11 rounded-xl"
                required
              />
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-qty">Quantity *</Label>
              <Input
                id="item-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="e.g. 10"
                className="h-11 rounded-xl"
                required
              />
            </div>

            {/* Unit */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-unit">Unit</Label>
              <select
                id="item-unit"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Donation Date — NEW */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="item-date">Donation Date *</Label>
             <Input
  id="item-date"
  type="date"
  value={form.donationDate}
  min={tomorrow}
  onChange={(e) => setForm((f) => ({ ...f, donationDate: e.target.value }))}
  className="h-11 rounded-xl"
  required
/>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="item-note">Note (optional)</Label>
              <textarea
                id="item-note"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Any details about the items..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full gap-2 rounded-xl"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : (
              <><Send className="h-4 w-4" /> Submit Donation Request</>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}