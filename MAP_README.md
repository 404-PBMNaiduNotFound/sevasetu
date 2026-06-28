# SevaSetu — Free Maps Integration

Zero-cost map integration using **Leaflet + OpenStreetMap** (no API key, no billing ever).

---

## What's included

| File | Purpose |
|------|---------|
| `lib/geocode.ts` | Free geocoding via Nominatim, GPS location helper, distance calc |
| `lib/firestore-vendors.ts` | `getApprovedVendors()` helper (add to `lib/firestore.ts`) |
| `components/map/LeafletMap.tsx` | Reusable Leaflet map (pins for orgs 🏢, vendors 🛒, user 📍) |
| `components/map/NearbyMap.tsx` | "Nearby orgs / vendors" with real-time GPS + radius filter |
| `components/map/AddressMapPin.tsx` | Inline address map for profile cards |
| `app/donor/browse/page.tsx` | Updated browse page — adds List / Nearby Map toggle |
| `components/vendor/find-vendor-step-a.tsx` | Updated find-vendor — adds expandable nearby-vendor map |

---

## 1-minute setup

### a) Install Leaflet

```bash
npm install leaflet
npm install -D @types/leaflet
```

### b) Copy files

```
lib/geocode.ts                          → your-project/lib/geocode.ts
lib/firestore-vendors.ts               → your-project/lib/firestore-vendors.ts
components/map/LeafletMap.tsx          → your-project/components/map/LeafletMap.tsx
components/map/NearbyMap.tsx           → your-project/components/map/NearbyMap.tsx
components/map/AddressMapPin.tsx       → your-project/components/map/AddressMapPin.tsx
app/donor/browse/page.tsx              → replace your existing browse page
components/vendor/find-vendor-step-a.tsx → replace your existing step-a
```

### c) Add `getApprovedVendors` to firestore.ts

Paste this at the end of `lib/firestore.ts` (or import from `lib/firestore-vendors.ts`):

```ts
export async function getApprovedVendors(): Promise<VendorDoc[]> {
  const { collection, getDocs, query, where } = await import("firebase/firestore")
  const q = query(collection(db, "vendors"), where("approvalStatus", "==", "approved"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as VendorDoc))
}
```

### d) Add the import to NearbyMap.tsx

In `components/map/NearbyMap.tsx`, change:
```ts
import { getOrganizations, getApprovedVendors, ... } from "@/lib/firestore"
```
to use whichever path you added `getApprovedVendors`.

---

## How to embed maps anywhere

### Nearby orgs (donor browse page — already done)
```tsx
<NearbyMap mode="orgs" radiusKm={50} onSelect={(id) => router.push(`/donor/org/${id}`)} />
```

### Nearby vendors (find-vendor — already done)
```tsx
<NearbyMap mode="vendors" radiusKm={30} />
```

### Address pin on any profile card
```tsx
import { AddressMapPin } from "@/components/map/AddressMapPin"

// Org profile
<AddressMapPin address={org.address} city={org.city} state={org.state} label={org.organizationName} type="org" />

// Vendor profile
<AddressMapPin address={vendor.address} city={vendor.city} state={vendor.state} zipCode={vendor.zipCode} label={vendor.businessName} type="vendor" />
```

See `INTEGRATION_GUIDE.ts` for exact before/after snippets for `org-profile.tsx`, `vendor/profile/page.tsx`, and `find-vendor-step-b.tsx`.

---

## How geocoding works

1. The user's plain-text address (e.g. "123 MG Road, Bangalore, Karnataka") is sent to
   the free [Nominatim API](https://nominatim.org/) (OpenStreetMap).
2. Results are cached in `localStorage` for 7 days — so repeated views are instant and
   don't hit the rate limit.
3. `NearbyMap` uses `navigator.geolocation` for the user's real-time GPS position, then
   computes Haversine distance to each geocoded entity.

**Rate limit:** Nominatim allows 1 request/second. The batch geocoder (`geocodeMany`)
automatically inserts 1.1 s delays between uncached requests.

---

## No API key required

All services used are 100% free and open:

| Service | Use | Cost |
|---------|-----|------|
| [Leaflet](https://leafletjs.com) | Interactive maps | Free, MIT |
| [OpenStreetMap tiles](https://wiki.osm.org/Tile_usage_policy) | Map imagery | Free (attribution required) |
| [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) | Geocoding | Free (1 req/s, no key) |
| `navigator.geolocation` | GPS | Built into browser |
