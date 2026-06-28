"use client"

/**
 * app/donor/browse/page.tsx  (UPDATED)
 *
 * Adds a "Nearby Organisations" tab alongside the existing list view.
 * Paste this file over app/donor/browse/page.tsx.
 */export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search, List, MapPin } from "lucide-react"
import { OrgCard } from "@/components/donor/org-card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { NearbyMap } from "@/components/map/NearbyMap"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getOrganizations, type OrganizationDoc } from "@/lib/firestore"
import { useRouter } from "next/navigation"

type ViewMode = "list" | "map"

export default function BrowsePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") ?? ""

  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(initialQuery)
  const [cause, setCause] = useState("All Causes")
  const [location, setLocation] = useState("All Locations")
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  useEffect(() => {
    const q = searchParams.get("q")
    if (q !== null) setQuery(q)
  }, [searchParams])

  useEffect(() => {
    getOrganizations()
      .then(setOrganizations)
      .catch((error) => console.error("Failed to load organizations:", error))
      .finally(() => setLoading(false))
  }, [])

  const getDisplayName = (org: OrganizationDoc) =>
    org.organizationName || org.name || "Unnamed Organization"

  const causes = useMemo(() => {
    const categories = [...new Set(organizations.map((org) => org.category).filter(Boolean))].sort()
    return ["All Causes", ...categories]
  }, [organizations])

  const locations = useMemo(() => {
    const cities = [
      ...new Set(organizations.map((org) => org.city).filter((c): c is string => Boolean(c))),
    ].sort()
    return ["All Locations", ...cities]
  }, [organizations])

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      const q = query.trim().toLowerCase()
      const displayName = getDisplayName(org).toLowerCase()
      const matchesQuery =
        !q ||
        displayName.includes(q) ||
        (org.category || "").toLowerCase().includes(q) ||
        (org.city || "").toLowerCase().includes(q) ||
        (org.state || "").toLowerCase().includes(q) ||
        (org.description || "").toLowerCase().includes(q)
      const matchesCause = cause === "All Causes" || org.category === cause
      const matchesLocation = location === "All Locations" || org.city === location
      return matchesQuery && matchesCause && matchesLocation
    })
  }, [organizations, query, cause, location])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <header>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Browse Organizations</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Discover verified organizations and choose where your support makes the biggest difference.
          </p>
        </header>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            viewMode === "list"
              ? "bg-blue-700 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          <List className="w-4 h-4" />
          List View
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            viewMode === "map"
              ? "bg-blue-700 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Nearby Map
        </button>
      </div>

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations, cause or location..."
                className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Select value={cause} onValueChange={setCause}>
              <SelectTrigger className="h-11 rounded-xl md:w-48">
                <SelectValue placeholder="All Causes" />
              </SelectTrigger>
              <SelectContent>
                {causes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-11 rounded-xl md:w-48">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <p className="-mt-3 text-sm text-muted-foreground">
            Showing <strong className="font-semibold text-foreground">{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "organization" : "organizations"}
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((org) => (
                <OrgCard key={org.uid || org.orgId} org={org} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="font-semibold text-foreground">No organizations found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" className="rounded-xl px-8">
                View More Organizations
              </Button>
            </div>
          )}
        </>
      )}

      {/* MAP VIEW */}
      {viewMode === "map" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <NearbyMap
            mode="orgs"
            radiusKm={50}
            mapHeight="420px"
            onSelect={(id) => router.push(`/donor/org/${id}`)}
          />
        </div>
      )}
    </div>
  )
}
