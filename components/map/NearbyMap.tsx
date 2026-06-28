"use client"

/**
 * components/map/NearbyMap.tsx
 *
 * Fetches the user's real-time GPS location, geocodes org/vendor addresses,
 * and renders a Leaflet map with distance-sorted results.
 *
 * Props:
 *   mode="orgs"    → shows organisations (blue pins)
 *   mode="vendors" → shows vendors (orange pins)
 *   radiusKm       → filters results beyond this radius (default 50 km)
 *
 * Example:
 *   <NearbyMap mode="orgs" radiusKm={20} />
 *   <NearbyMap mode="vendors" radiusKm={30} />
 */

import { useEffect, useState, useCallback } from "react"
import { MapPin, Loader2, AlertCircle, Navigation, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeafletMap, MapMarker } from "./LeafletMap"
import { geocodeAddress, getCurrentLocation, distanceKm, LatLng } from "@/lib/geocode"
import { getOrganizations, getApprovedVendors, OrganizationDoc, VendorDoc } from "@/lib/firestore"

interface NearbyMapProps {
  mode: "orgs" | "vendors"
  radiusKm?: number
  /** Fixed height for the map tile */
  mapHeight?: string
  /** Called when user clicks a marker — gives the entity id */
  onSelect?: (id: string) => void
}

interface PlacedEntity {
  id: string
  label: string
  address: string
  latlng: LatLng
  distanceKm: number
  raw: OrganizationDoc | VendorDoc
}

type Status = "idle" | "locating" | "geocoding" | "done" | "error"

export function NearbyMap({
  mode,
  radiusKm = 50,
  mapHeight = "380px",
  onSelect,
}: NearbyMapProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [userLoc, setUserLoc] = useState<LatLng | null>(null)
  const [entities, setEntities] = useState<PlacedEntity[]>([])
  const [error, setError] = useState("")
  const [geocodedCount, setGeocodedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const run = useCallback(async () => {
    setStatus("locating")
    setError("")
    setEntities([])
    setGeocodedCount(0)

    // 1. Get user GPS
    const loc = await getCurrentLocation()
    if (!loc) {
      setError("Location access denied. Please allow location in your browser and try again.")
      setStatus("error")
      return
    }
    setUserLoc(loc)
    setStatus("geocoding")

    // 2. Fetch entities from Firestore
    let raws: { id: string; label: string; address: string; savedLat?: number; savedLng?: number; raw: OrganizationDoc | VendorDoc }[] = []
    try {
      if (mode === "orgs") {
        const orgs = await getOrganizations()
        raws = orgs.map((o) => ({
          id: o.uid ?? o.orgId ?? "",
          label: o.organizationName ?? o.name ?? "Organisation",
          address: [o.address, o.city, o.state].filter(Boolean).join(", "),
          // Use saved pin coordinates first — avoids geocoding entirely and never drops
          // orgs whose address string Nominatim can't resolve
          savedLat: (o as any).lat as number | undefined,
          savedLng: (o as any).lng as number | undefined,
          raw: o,
        }))
      } else {
        const vendors = await getApprovedVendors()
        raws = vendors.map((v) => ({
          id: v.uid,
          label: v.businessName,
          address: [v.address, v.city, v.state, v.zipCode].filter(Boolean).join(", "),
          savedLat: v.lat,
          savedLng: v.lng,
          raw: v,
        }))
      }
    } catch (e) {
      setError("Could not load data. Check your connection and try again.")
      setStatus("error")
      return
    }

    setTotalCount(raws.length)

    // 3. Resolve coordinates for each entity.
    //    Priority: saved lat/lng from Firestore (instant, no API call needed)
    //    Fallback: geocode the address string via Nominatim (slow, rate-limited, can fail)
    //    Entities with neither are skipped.
    const placed: PlacedEntity[] = []
    // Count only entities that need geocoding for the progress bar
    const needsGeocode = raws.filter(
      (e) => !(e.savedLat && e.savedLng && e.savedLat !== 0 && e.savedLng !== 0)
    )
    let geocodeIdx = 0
    setTotalCount(needsGeocode.length || 1)

    for (let i = 0; i < raws.length; i++) {
      const entity = raws[i]
      let latlng: LatLng | null = null

      if (entity.savedLat && entity.savedLng && entity.savedLat !== 0 && entity.savedLng !== 0) {
        // Use the pinned location saved in Firestore — no API call needed
        latlng = { lat: entity.savedLat, lng: entity.savedLng }
      } else if (entity.address) {
        // Fall back to address geocoding
        latlng = await geocodeAddress(entity.address)
        geocodeIdx++
        setGeocodedCount(geocodeIdx)
      }

      if (!latlng) continue
      const dist = distanceKm(loc, latlng)
      if (dist <= radiusKm) {
        placed.push({
          ...entity,
          latlng,
          distanceKm: dist,
        })
      }
    }

    // Sort nearest first
    placed.sort((a, b) => a.distanceKm - b.distanceKm)
    setEntities(placed)
    setStatus("done")
  }, [mode, radiusKm])

  const markers: MapMarker[] = [
    ...entities.map((e) => ({
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      label: e.label,
      sublabel: `${e.distanceKm.toFixed(1)} km away · ${e.address}`,
      type: (mode === "orgs" ? "org" : "vendor") as any,
      onClick: onSelect ? () => onSelect(e.id) : undefined,
    })),
  ]

  const isOrgMode = mode === "orgs"
  const entityLabel = isOrgMode ? "organisations" : "vendors"
  const colour = isOrgMode ? "text-blue-600" : "text-orange-600"

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MapPin className={`w-5 h-5 ${colour}`} />
          <h3 className="font-semibold text-navy-primary capitalize">
            Nearby {entityLabel}
          </h3>
          {status === "done" && (
            <span className="text-sm text-muted-foreground">
              — {entities.length} within {radiusKm} km
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={status === "idle" ? "default" : "outline"}
          onClick={run}
          disabled={status === "locating" || status === "geocoding"}
          className="gap-2"
        >
          {status === "locating" || status === "geocoding" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : status === "done" ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {status === "idle"
            ? `Find Nearby ${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)}`
            : status === "locating"
            ? "Getting location…"
            : status === "geocoding"
            ? `Geocoding ${geocodedCount}/${totalCount}…`
            : "Refresh"}
        </Button>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="flex gap-3 items-start p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Progress bar while geocoding */}
      {status === "geocoding" && totalCount > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-action-blue transition-all duration-300 rounded-full"
              style={{ width: `${(geocodedCount / totalCount) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Resolving addresses… {geocodedCount} / {totalCount}
          </p>
        </div>
      )}

      {/* Map */}
      {(status === "done" || status === "geocoding") && userLoc && (
        <LeafletMap
          markers={markers}
          userLocation={userLoc}
          height={mapHeight}
          fitBounds
        />
      )}

      {/* Result list */}
      {status === "done" && entities.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No {entityLabel} found within {radiusKm} km</p>
          <p className="text-sm mt-1">Try increasing the radius or check your location.</p>
        </div>
      )}

      {status === "done" && entities.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {entities.map((e) => (
            <li
              key={e.id}
              className={`flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow ${
                onSelect ? "cursor-pointer hover:border-primary/40" : ""
              }`}
              onClick={() => onSelect?.(e.id)}
            >
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  isOrgMode ? "bg-blue-600" : "bg-orange-500"
                }`}
              >
                {e.label.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{e.label}</p>
                <p className="text-xs text-muted-foreground truncate">{e.address}</p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isOrgMode
                    ? "bg-blue-50 text-blue-700"
                    : "bg-orange-50 text-orange-700"
                }`}
              >
                {e.distanceKm.toFixed(1)} km
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Idle prompt */}
      {status === "idle" && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground border border-dashed border-border rounded-xl">
          <Navigation className="w-8 h-8 opacity-40" />
          <p className="text-sm">
            Click the button above to find {entityLabel} near you using your GPS location.
          </p>
        </div>
      )}
    </div>
  )
}
