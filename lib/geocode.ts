/**
 * lib/geocode.ts
 * 
 * Free geocoding via OpenStreetMap Nominatim — no API key required.
 * Rate limit: 1 request/second (Nominatim policy). Cache results in
 * localStorage to avoid hammering the API and to make repeat views instant.
 */

export interface LatLng {
  lat: number
  lng: number
}

const CACHE_KEY_PREFIX = "geocode_cache:"
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry {
  result: LatLng | null
  ts: number
}

function cacheGet(address: string): LatLng | null | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + address)
    if (!raw) return undefined
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL_MS) return undefined
    return entry.result
  } catch {
    return undefined
  }
}

function cacheSet(address: string, result: LatLng | null) {
  try {
    const entry: CacheEntry = { result, ts: Date.now() }
    localStorage.setItem(CACHE_KEY_PREFIX + address, JSON.stringify(entry))
  } catch {
    // localStorage full or SSR — silently skip
  }
}

/**
 * Geocode a plain-text address string using Nominatim.
 * Returns null if the address cannot be resolved.
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!address?.trim()) return null

  const cached = cacheGet(address)
  if (cached !== undefined) return cached

  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", address)
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", "1")
  url.searchParams.set("addressdetails", "0")

  try {
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a User-Agent (your app name / contact)
        "User-Agent": "SevaSetu/1.0 (contact@sevasetu.org)",
        "Accept-Language": "en",
      },
    })
    if (!res.ok) { cacheSet(address, null); return null }
    const data = await res.json()
    if (!data.length) { cacheSet(address, null); return null }
    const result: LatLng = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
    cacheSet(address, result)
    return result
  } catch {
    return null
  }
}

/**
 * Batch-geocode multiple addresses.
 * Respects Nominatim's 1 req/s limit by inserting 1100 ms delays
 * between requests that aren't already cached.
 */
export async function geocodeMany(
  addresses: string[]
): Promise<(LatLng | null)[]> {
  const results: (LatLng | null)[] = []
  for (let i = 0; i < addresses.length; i++) {
    const cached = cacheGet(addresses[i])
    if (cached !== undefined) {
      results.push(cached)
    } else {
      if (i > 0) await sleep(1100) // rate-limit
      results.push(await geocodeAddress(addresses[i]))
    }
  }
  return results
}

/**
 * Get the user's current location via the browser Geolocation API.
 *
 * Why watchPosition instead of getCurrentPosition:
 *   getCurrentPosition often resolves immediately with a coarse IP-based fix
 *   (accuracy ~2000–5000 m, always pointing at your ISP's city — e.g. Hyderabad).
 *   watchPosition keeps firing until we receive a fix whose accuracy is within
 *   ACCURACY_THRESHOLD_M metres (actual GPS). We cap the wait at MAX_WAIT_MS so
 *   the user isn't stuck forever if they're indoors with poor signal.
 *
 * Returns null if geolocation is unavailable, denied, or times out entirely.
 */
const ACCURACY_THRESHOLD_M = 150  // accept fix only if GPS accuracy ≤ 150 m
const MAX_WAIT_MS           = 20_000 // give up after 20 s

export function getCurrentLocation(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) { resolve(null); return }

    let watchId: number
    let settled = false

    const done = (result: LatLng | null) => {
      if (settled) return
      settled = true
      navigator.geolocation.clearWatch(watchId)
      resolve(result)
    }

    // Hard timeout — if GPS never reaches the threshold, use best result so far
    let bestSoFar: LatLng | null = null
    const timer = setTimeout(() => done(bestSoFar), MAX_WAIT_MS)

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const coords: LatLng = { lat: latitude, lng: longitude }

        // Always keep the latest as fallback
        bestSoFar = coords

        // Only resolve immediately if this is an accurate GPS fix
        if (accuracy <= ACCURACY_THRESHOLD_M) {
          clearTimeout(timer)
          done(coords)
        }
        // else: keep watching for a better fix
      },
      () => {
        clearTimeout(timer)
        done(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,        // never serve a cached position
        timeout: MAX_WAIT_MS,
      }
    )
  })
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = deg2rad(b.lat - a.lat)
  const dLng = deg2rad(b.lng - a.lng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function deg2rad(d: number) { return (d * Math.PI) / 180 }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export interface ReverseGeocodeResult {
  city: string
  state: string
  address: string
}

/**
 * Reverse-geocode a lat/lng to a human-readable address using Nominatim.
 * Returns city, state, and a short display address.
 * Returns null if the coordinates cannot be resolved.
 */
export async function reverseGeocode(latlng: LatLng): Promise<ReverseGeocodeResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse")
    url.searchParams.set("lat", String(latlng.lat))
    url.searchParams.set("lon", String(latlng.lng))
    url.searchParams.set("format", "json")
    url.searchParams.set("addressdetails", "1")
    url.searchParams.set("zoom", "16")

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "SevaSetu/1.0 (contact@sevasetu.org)",
        "Accept-Language": "en",
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.address) return null

    const a = data.address

    // Nominatim uses different keys depending on location granularity
    const city =
      a.city || a.town || a.village || a.suburb || a.county || a.district || ""
    const state = a.state || ""
    // Build a short display address: neighbourhood/suburb + city + state
    const parts = [
      a.neighbourhood || a.suburb || a.quarter || "",
      city,
      state,
    ].filter(Boolean)
    const address = parts.join(", ")

    return { city, state, address }
  } catch {
    return null
  }
}
