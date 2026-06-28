/**
 * HOW TO INTEGRATE AddressMapPin into org-profile.tsx
 *
 * Find the section that renders the address (search for "address" or "MapPin" in
 * components/org/org-profile.tsx), then replace the plain address text with:
 *
 * ─────────────────────────────────────────────────────────────────
 * BEFORE (typical pattern in org-profile.tsx):
 *
 *   <p className="text-sm text-muted-foreground">
 *     <MapPin className="inline w-4 h-4 mr-1" />
 *     {org.address}
 *   </p>
 *
 * AFTER:
 *
 *   import { AddressMapPin } from "@/components/map/AddressMapPin"
 *
 *   <AddressMapPin
 *     address={org.address}
 *     city={org.city}
 *     state={org.state}
 *     label={org.organizationName}
 *     type="org"
 *     height="220px"
 *   />
 * ─────────────────────────────────────────────────────────────────
 *
 *
 * HOW TO INTEGRATE AddressMapPin into vendor/profile/page.tsx
 *
 * ─────────────────────────────────────────────────────────────────
 * BEFORE:
 *
 *   <p>{vendor.address}, {vendor.city}</p>
 *
 * AFTER:
 *
 *   import { AddressMapPin } from "@/components/map/AddressMapPin"
 *
 *   <AddressMapPin
 *     address={vendor.address}
 *     city={vendor.city}
 *     state={vendor.state}
 *     zipCode={vendor.zipCode}
 *     label={vendor.businessName}
 *     type="vendor"
 *     height="200px"
 *   />
 * ─────────────────────────────────────────────────────────────────
 *
 *
 * HOW TO INTEGRATE AddressMapPin into find-vendor-step-b.tsx
 * (delivery details section already shows orgAddress as text)
 *
 * ─────────────────────────────────────────────────────────────────
 * Replace the existing delivery address <div> block with:
 *
 *   import { AddressMapPin } from "@/components/map/AddressMapPin"
 *
 *   // inside the Card "Delivery Details":
 *   <AddressMapPin
 *     address={orgAddress}
 *     label={orgName}
 *     type="org"
 *     height="180px"
 *   />
 * ─────────────────────────────────────────────────────────────────
 */

export {} // makes TypeScript treat this as a module
