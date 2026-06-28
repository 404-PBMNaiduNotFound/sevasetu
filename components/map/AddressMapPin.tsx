"use client"

/**
 * components/map/AddressMapPin.tsx
 *
 * Read-only map pin display for org / vendor / donor addresses.
 *
 * Priority:
 *   1. savedLat / savedLng (from Firestore) — instant, accurate, no API call
 *   2. Geocode fullAddress via Nominatim — fallback only when no saved pin
 *
 * Fix log:
 *  - LeafletMap now receives a `key` derived from the coords so it fully
 *    re-mounts when savedLat/savedLng change after a save, rather than staying
 *    stuck on the previous position.
 *  - Geocoding fallback is guarded: it only fires when BOTH savedLat and savedLng
 *    are truly absent (undefined or 0), not just one of them.
 */

import { useEffect, useState } from "react"
import { MapPin, Loader2, ExternalLink } from "lucide-react"
import { LeafletMap } from "./LeafletMap"
import { geocodeAddress, LatLng } from "@/lib/geocode"

interface AddressMapPinProps {
  address?: string
  city?: string
  state?: string
  zipCode?: string
  label: string
  type?: "org" | "vendor" | "donor"
  height?: string
  showMapInline?: boolean
  /** Pre-saved coordinates from Firestore — overrides geocoding */
  savedLat?: number
  savedLng?: number
}

export function AddressMapPin({
  address,
  city,
  state,
  zipCode,
  label,
  type = "org",
  height = "220px",
  showMapInline = true,
  savedLat,
  savedLng,
}: AddressMapPinProps) {
  const [latlng, setLatlng] = useState<LatLng | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const fullAddress = [address, city, state, zipCode].filter(Boolean).join(", ")
  const osmLink = fullAddress
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress)}`
    : null

  // Stable key forces LeafletMap to remount whenever coordinates actually change
  const hasSavedPin = !!(savedLat && savedLng && savedLat !== 0 && savedLng !== 0)
  const mapKey = hasSavedPin
    ? `pin-${savedLat}-${savedLng}`
    : `geocode-${fullAddress}`

  useEffect(() => {
    // Priority 1: use pinned coords — no network call needed
    if (hasSavedPin) {
      setLatlng({ lat: savedLat!, lng: savedLng! })
      setLoading(false)
      setFailed(false)
      return
    }

    // Priority 2: geocode the text address
    if (!fullAddress) {
      setLatlng(null)
      return
    }
    setLoading(true)
    setFailed(false)
    geocodeAddress(fullAddress).then((result) => {
      setLatlng(result)
      if (!result) setFailed(true)
      setLoading(false)
    })
  }, [fullAddress, savedLat, savedLng, hasSavedPin])

  return (
    <div className="space-y-2">
      {/* Address row */}
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{fullAddress || "No address provided"}</p>
          {hasSavedPin && (
            <p className="text-xs text-green-600 mt-0.5 font-medium">📍 Pinned location</p>
          )}
        </div>
        {osmLink && (
          <a
            href={osmLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs text-action-blue hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Open Map
          </a>
        )}
      </div>

      {/* Inline map tile */}
      {showMapInline && (hasSavedPin || fullAddress) && (
        <div>
          {loading && (
            <div
              className="flex items-center justify-center rounded-xl border border-border bg-muted"
              style={{ height }}
            >
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && failed && (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground"
              style={{ height }}
            >
              <MapPin className="w-6 h-6 opacity-40" />
              <p className="text-xs">Map unavailable for this address</p>
              {osmLink && (
                <a
                  href={osmLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-action-blue hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Search on OpenStreetMap
                </a>
              )}
            </div>
          )}

          {!loading && latlng && (
            // key forces full remount when coords change after a save
            <LeafletMap
              key={mapKey}
              markers={[{ lat: latlng.lat, lng: latlng.lng, label, type }]}
              height={height}
              fitBounds={false}
              zoom={16}
            />
          )}
        </div>
      )}
    </div>
  )
}