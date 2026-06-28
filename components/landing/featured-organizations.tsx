"use client"

import { useEffect, useState } from "react"
import { MapPin, BadgeCheck, ArrowRight, Building2, X, Mail, Phone, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getOrganizations, type OrganizationDoc } from "@/lib/firestore"
import { cn } from "@/lib/utils"

// ── Org Detail Modal ──────────────────────────────────────────────────────────

function OrgDetailModal({
  org,
  onClose,
}: {
  org: OrganizationDoc | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!org) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [org, onClose])

  if (!org) return null

  const displayName = org.organizationName ?? org.name ?? "Unnamed Organization"
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.address || ""
  const cover = org.photoURLs?.[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Cover image */}
        {cover && (
          <div className="relative h-40 w-full overflow-hidden bg-muted">
            <img src={cover} alt={`${displayName} cover`} className="h-full w-full object-contain" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{displayName}</p>
              {location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {location}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <BadgeCheck className="h-3.5 w-3.5" />
              Active
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4">
          {org.category && (
            <span className="w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
              {org.category}
            </span>
          )}

          {org.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{org.description}</p>
          )}

          <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
            {org.email && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-24 shrink-0">Email</span>
                <span className="text-sm font-medium text-foreground">{org.email}</span>
              </div>
            )}
            {org.phone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-24 shrink-0">Phone</span>
                <span className="text-sm font-medium text-foreground">{org.phone}</span>
              </div>
            )}
            {org.website && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-24 shrink-0">Website</span>
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {org.website}
                </a>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-24 shrink-0">Location</span>
                <span className="text-sm font-medium text-foreground">{location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── All Orgs Modal ────────────────────────────────────────────────────────────

function AllOrgsModal({
  organizations,
  onClose,
  onViewOrg,
}: {
  organizations: OrganizationDoc[]
  onClose: () => void
  onViewOrg: (org: OrganizationDoc) => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <p className="font-semibold text-foreground text-lg">All Organizations</p>
            <p className="text-xs text-muted-foreground">{organizations.length} verified NGOs</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => {
              const displayName = org.organizationName ?? org.name ?? "Unnamed Organization"
              const location = [org.city, org.state].filter(Boolean).join(", ") || org.address || ""
              const cover = org.photoURLs?.[0]
              return (
                <article
                  key={org.uid ?? org.orgId}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md w-full max-w-[380px] h-[450px] mx-auto"
                >
                  <div className="relative flex h-48 w-full items-center justify-center bg-muted overflow-hidden shrink-0">
                    {cover ? (
                      <img src={cover} alt={displayName} className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground/30" />
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                      {org.category || "General"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold leading-snug text-foreground">{displayName}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        <BadgeCheck className="h-3 w-3" />
                        Active
                      </span>
                    </div>
                    {location && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </p>
                    )}
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {org.description || "Supporting communities through meaningful impact."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full rounded-xl border-primary text-primary hover:bg-accent"
                      onClick={() => { onClose(); onViewOrg(org) }}
                    >
                      View Details
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────────────

export function FeaturedOrganizations() {
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<OrganizationDoc | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    getOrganizations()
      .then(setOrganizations)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const displayed = organizations.slice(0, 6)

  return (
    <section id="organizations" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-pretty text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Featured organizations
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Hand-picked, fully verified causes that need your support today. Every donation is
            tracked and reported.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-xl border-2 border-primary font-medium text-primary hover:bg-accent"
          onClick={() => setShowAll(true)}
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-pulse w-full max-w-[380px] h-[500px] mx-auto"
            >
              <div className="h-56 w-full bg-muted shrink-0" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
                <div className="mt-auto h-2 w-full rounded bg-muted" />
                <div className="h-9 w-full rounded-xl bg-muted" />
              </div>
            </div>
          ))
        ) : organizations.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-foreground">No organizations yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to register your organization and start making an impact.
            </p>
            <Button className="mt-6 rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90">
              Register your organization
            </Button>
          </div>
        ) : (
          displayed.map((org) => (
            <OrgCard key={org.uid ?? org.orgId} org={org} onView={() => setSelectedOrg(org)} />
          ))
        )}
      </div>

      {/* Org detail modal */}
      <OrgDetailModal org={selectedOrg} onClose={() => setSelectedOrg(null)} />

      {/* All orgs modal */}
      {showAll && (
        <AllOrgsModal
          organizations={organizations}
          onClose={() => setShowAll(false)}
          onViewOrg={(org) => setSelectedOrg(org)}
        />
      )}
    </section>
  )
}

// ── Org Card ──────────────────────────────────────────────────────────────────

function OrgCard({ org, onView }: { org: OrganizationDoc; onView: () => void }) {
  const displayName = org.organizationName ?? org.name ?? "Unnamed Organization"
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.address || ""
  const cover = org.photoURLs?.[0]

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md w-full max-w-[380px] h-[500px] mx-auto">
      <div className="relative h-56 w-full overflow-hidden bg-muted shrink-0">
        {cover ? (
          <img src={cover} alt={displayName} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
          {org.category || "General"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold leading-snug text-foreground">{displayName}</h3>
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <BadgeCheck className="h-3.5 w-3.5" />
            Active
          </span>
        </div>

        {location ? (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </p>
        ) : null}

        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {org.description || "Supporting communities through meaningful impact."}
        </p>

        <Button
          variant="outline"
          className="mt-4 w-full rounded-xl border-primary text-primary hover:bg-accent"
          onClick={onView}
        >
          View Details
        </Button>
      </div>
    </article>
  )
}
