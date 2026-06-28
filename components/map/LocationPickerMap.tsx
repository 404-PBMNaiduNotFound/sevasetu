"use client"

/**
 * components/map/LocationPickerMap.tsx
 *
 * Interactive Leaflet map for pinning an exact location.
 * Used in Org settings, Vendor profile, and Donor settings.
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { Navigation, Loader2, MapPin, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentLocation, LatLng } from "@/lib/geocode"

interface LocationPickerMapProps {
  initialLat?: number
  initialLng?: number
  /** @deprecated no-op — kept so callers don't need to change props */
  addressHint?: string
  /**
   * Pass false while the parent is still loading saved coords from Firestore.
   * The map renders a skeleton and does NOT initialise Leaflet until this is true.
   * Defaults to true so existing callers that don't pass it still work.
   */
  isReady?: boolean
  onLocationPicked: (coords: LatLng) => void
  height?: string
  className?: string
}

/** Injects Leaflet CSS and returns a promise that resolves once it has loaded. */
function ensureLeafletCSS(): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.getElementById("leaflet-css") as HTMLLinkElement | null
    if (existing) {
      // Already injected — if it's done loading, resolve immediately
      if (existing.sheet) { resolve(); return }
      existing.addEventListener("load", () => resolve(), { once: true })
      return
    }
    const link = document.createElement("link")
    link.id = "leaflet-css"
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.addEventListener("load", () => resolve(), { once: true })
    document.head.appendChild(link)
  })
}

export function LocationPickerMap({
  initialLat,
  initialLng,
  isReady = true,
  onLocationPicked,
  height = "320px",
  className = "",
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onPickedRef = useRef(onLocationPicked)
  const initDoneRef = useRef(false)

  useEffect(() => { onPickedRef.current = onLocationPicked }, [onLocationPicked])

  const hasSavedPin = !!(initialLat && initialLng && initialLat !== 0 && initialLng !== 0)

  const [mapStatus, setMapStatus] = useState<"loading" | "ready">("loading")
  const [pickedLatLng, setPickedLatLng] = useState<LatLng | null>(
    hasSavedPin ? { lat: initialLat!, lng: initialLng! } : null
  )
  const [gpsLoading, setGpsLoading] = useState(false)

  const placeMarker = useCallback((L: any, map: any, latlng: LatLng) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([latlng.lat, latlng.lng])
    } else {
      const icon = L.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));">
          <div style="background:#2563eb;color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:grab;">📍</div>
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:11px solid #2563eb;margin-top:-2px;"></div>
        </div>`,
        className: "",
        iconSize: [38, 49],
        iconAnchor: [19, 49],
        popupAnchor: [0, -52],
      })
      const marker = L.marker([latlng.lat, latlng.lng], { icon, draggable: true }).addTo(map)
      marker.bindPopup("<b>Your location</b><br>Drag to fine-tune")
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng()
        const coords: LatLng = { lat: pos.lat, lng: pos.lng }
        setPickedLatLng(coords)
        onPickedRef.current(coords)
      })
      markerRef.current = marker
    }
    setPickedLatLng(latlng)
    onPickedRef.current(latlng)
  }, [])

  useEffect(() => {
    if (!isReady) return
    if (initDoneRef.current) return
    const container = containerRef.current
    if (!container) return
    initDoneRef.current = true

    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id
    }

    // Guards against the init promise resolving — or a pending RAF/timeout
    // firing — after this effect has already been cleaned up (unmount,
    // isReady toggling, or React Strict Mode's double-invoke in dev).
    // Without this, invalidateSize() can run on a map that .remove() already
    // tore down, throwing "Cannot read properties of undefined (reading
    // '_leaflet_pos')".
    let disposed = false
    let rafId: number | null = null
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null

    // Load CSS first, THEN import Leaflet and init the map.
    // If the stylesheet isn't fully parsed before L.map() runs, Leaflet
    // miscalculates tile sizes and the map renders blank.
    Promise.all([
      ensureLeafletCSS(),
      import("leaflet"),
    ]).then(([, L]) => {
      if (disposed || !containerRef.current || mapRef.current) return

      const centre: [number, number] = hasSavedPin
        ? [initialLat!, initialLng!]
        : [20.5937, 78.9629]
      const zoom = hasSavedPin ? 16 : 5

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: true,
      }).setView(centre, zoom)

      mapRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (hasSavedPin) {
        placeMarker(L, map, { lat: initialLat!, lng: initialLng! })
      }

      map.on("click", (e: any) => {
        placeMarker(L, map, { lat: e.latlng.lat, lng: e.latlng.lng })
      })

      // Force Leaflet to re-measure the container after first paint.
      // Needed when the map is inside a scrollable card or was hidden on mount.
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (disposed) return
        map.invalidateSize({ animate: false })
        // Second pass after a short delay covers cases where the container
        // is still transitioning (e.g. a CSS animation on the settings card).
        invalidateTimer = setTimeout(() => {
          invalidateTimer = null
          if (disposed) return
          map.invalidateSize({ animate: false })
        }, 300)
      })

      setMapStatus("ready")
    })

    return () => {
      disposed = true
      initDoneRef.current = false
      markerRef.current = null
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (invalidateTimer !== null) clearTimeout(invalidateTimer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  const handleUseGPS = async () => {
    setGpsLoading(true)
    try {
      const loc = await getCurrentLocation()
      if (!mapRef.current) return // unmounted (or map torn down) while we were waiting on GPS
      if (!loc) {
        alert("Could not get your GPS location. Please allow location access in your browser.")
        return
      }
      mapRef.current.setView([loc.lat, loc.lng], 17)
      const L = await import("leaflet")
      if (!mapRef.current) return // re-check: unmount could've happened during the import too
      placeMarker(L, mapRef.current, loc)
    } finally {
      setGpsLoading(false)
    }
  }

  const handleClear = () => {
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    setPickedLatLng(null)
    onPickedRef.current({ lat: 0, lng: 0 })
  }

  // Skeleton while parent loads Firestore data
  if (!isReady) {
    return (
      <div
        className={`rounded-xl border-2 border-border bg-muted/30 animate-pulse ${className}`}
        style={{ height }}
      />
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleUseGPS}
          disabled={gpsLoading || mapStatus === "loading"}
          className="gap-2 rounded-xl"
        >
          {gpsLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Navigation className="w-4 h-4" />}
          {gpsLoading ? "Waiting for GPS fix…" : "Use My Location"}
        </Button>

        {pickedLatLng && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="gap-2 rounded-xl text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Pin
          </Button>
        )}

        {pickedLatLng && (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
            📍 {pickedLatLng.lat.toFixed(5)}, {pickedLatLng.lng.toFixed(5)}
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height, width: "100%" }}
          className={`rounded-xl overflow-hidden border-2 transition-colors ${
            pickedLatLng ? "border-blue-400" : "border-border"
          }`}
        />
        {mapStatus === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/70 rounded-xl">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading map…</p>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3 shrink-0" />
        {pickedLatLng
          ? "Location pinned — hit Save to persist to your profile."
          : "Click anywhere on the map, or use \u201cUse My Location\u201d to pin your exact spot. Then hit Save."}
      </p>
    </div>
  )
}