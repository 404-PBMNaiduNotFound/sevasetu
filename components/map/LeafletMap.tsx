"use client"

import { useEffect, useRef } from "react"

export type MarkerType = "org" | "vendor" | "donor" | "user"

export interface MapMarker {
  lat: number
  lng: number
  label: string
  sublabel?: string
  type?: MarkerType
  onClick?: () => void
}

interface LeafletMapProps {
  markers: MapMarker[]
  userLocation?: { lat: number; lng: number } | null
  height?: string
  className?: string
  fitBounds?: boolean
  zoom?: number
}

const MARKER_COLORS: Record<MarkerType, string> = {
  org: "#2563eb",
  vendor: "#ea580c",
  donor: "#16a34a",
  user: "#7c3aed",
}

const MARKER_LABELS: Record<MarkerType, string> = {
  org: "🏢",
  vendor: "🛒",
  donor: "❤️",
  user: "📍",
}

function makeDivIcon(L: any, type: MarkerType = "org") {
  const color = MARKER_COLORS[type]
  const emoji = MARKER_LABELS[type]
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <div style="background:${color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${emoji}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px;"></div>
      </div>`,
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  })
}

export function LeafletMap({
  markers,
  userLocation,
  height = "400px",
  className = "",
  fitBounds = true,
  zoom = 13,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  // Tracks whether the async init has already started (survives StrictMode double-invoke)
  const initStartedRef = useRef(false)

  // ── One-time map init ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if ((container as any)._leaflet_id) {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      delete (container as any)._leaflet_id
    }
    if (initStartedRef.current) return
    initStartedRef.current = true

    // Load CSS first so Leaflet measures tiles correctly (blank-map fix)
    function ensureCSS(): Promise<void> {
      return new Promise((resolve) => {
        const existing = document.getElementById("leaflet-css") as HTMLLinkElement | null
        if (existing) { if (existing.sheet) { resolve(); return }; existing.addEventListener("load", () => resolve(), { once: true }); return }
        const link = document.createElement("link")
        link.id = "leaflet-css"; link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.addEventListener("load", () => resolve(), { once: true })
        document.head.appendChild(link)
      })
    }

    Promise.all([ensureCSS(), import("leaflet")]).then(([, L]) => {
      if (!containerRef.current || mapRef.current) return

      const centre: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : markers[0] ? [markers[0].lat, markers[0].lng] : [20.5937, 78.9629]

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(centre, zoom)
      mapRef.current = map
      ;(mapRef as any).L = L   // stash L so the marker-update effect can reuse it

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false })
        setTimeout(() => map.invalidateSize({ animate: false }), 300)
      })
    })

    return () => {
      initStartedRef.current = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      if (containerRef.current) delete (containerRef.current as any)._leaflet_id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-render markers whenever markers / userLocation change ───────────────
  // This runs after the init effect and every time props update, so markers
  // added incrementally (as NearbyMap geocodes addresses one by one) all show.
  useEffect(() => {
    const map = mapRef.current
    const L = (mapRef as any).L
    if (!map || !L) return

    // Clear all existing layers except the tile layer
    map.eachLayer((layer: any) => {
      if (layer._url) return   // keep tile layer
      map.removeLayer(layer)
    })

    const allPoints: [number, number][] = []

    if (userLocation) {
      allPoints.push([userLocation.lat, userLocation.lng])
      L.marker([userLocation.lat, userLocation.lng], { icon: makeDivIcon(L, "user") })
        .addTo(map)
        .bindPopup("<b>📍 Your Location</b>")
    }

    markers.forEach((m) => {
      allPoints.push([m.lat, m.lng])
      const marker = L.marker([m.lat, m.lng], { icon: makeDivIcon(L, m.type ?? "org") }).addTo(map)
      marker.bindPopup(`
        <div style="min-width:160px;font-family:sans-serif;">
          <b style="font-size:14px;">${m.label}</b>
          ${m.sublabel ? `<p style="margin:4px 0 0;font-size:12px;color:#666;">${m.sublabel}</p>` : ""}
        </div>`)
      if (m.onClick) marker.on("click", () => m.onClick!())
    })

    if (fitBounds && allPoints.length > 1) {
      map.fitBounds(allPoints, { padding: [40, 40] })
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], zoom)
    }
  // Stringify markers to get a stable dep that actually changes when content changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, userLocation, fitBounds, zoom])

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`rounded-xl overflow-hidden border border-border ${className}`}
    />
  )
}
