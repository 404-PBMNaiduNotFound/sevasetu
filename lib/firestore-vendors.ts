/**
 * lib/firestore-vendors.ts
 *
 * Drop this into lib/ and re-export from lib/firestore.ts,
 * OR import directly from here in your map components.
 *
 * Adds the missing getApprovedVendors() helper used by NearbyMap.
 */

import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "./firebase"
import type { VendorDoc } from "./firestore"

/** Returns all vendors with approvalStatus === "approved" */
export async function getApprovedVendors(): Promise<VendorDoc[]> {
  const q = query(
    collection(db, "vendors"),
    where("approvalStatus", "==", "approved")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as VendorDoc))
}
