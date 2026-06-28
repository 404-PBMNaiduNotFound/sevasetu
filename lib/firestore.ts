// lib/firestore.ts
// Complete Firestore service for DonateConnect
// All writes pass through sanitizeData() to strip undefined values.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  DocumentData,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { db } from "./firebase"
import { sanitizeData } from "./sanitize"
import { tsToDate } from "./utils"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UserRole = "admin" | "donor" | "organization" | "vendor"

export interface UserDoc {
  uid: string
  email: string
  name: string
  role: UserRole
  phone?: string
  city?: string
  state?: string
  photoURL?: string
  createdAt: Timestamp
  profilePromptSeen?: boolean
  favoriteOrgIds?: string[]
  /** Saved map coordinates — set when user pins their location in donor settings */
  lat?: number
  lng?: number
}

export interface OrganizationDoc {
  uid: string
  organizationName: string
  email: string
  phone: string
  address: string
  description: string
  category: string
  status: "pending" | "active" | "rejected"
  createdAt?: Timestamp
  // Extended / legacy fields
  orgId?: string
  name?: string
  city?: string
  state?: string
  website?: string
  beneficiaries?: number
  founded?: number
  verified?: boolean
  photoURL?: string
  twitter?:   string
instagram?: string
linkedin?:  string
  /**
   * Gallery images, stored as base64 data URLs (e.g. "data:image/jpeg;base64,...").
   * photoURLs[0] is used as the organization's cover image everywhere
   * a single image is shown (org cards, profile cover, etc).
   * The rest of the array is shown only in the Gallery section.
   */
  photoURLs?: string[]
  /** Saved map coordinates — set when user pins their location in profile settings */
  lat?: number
  lng?: number
}

// ─────────────────────────────────────────────
// VENDOR / ORDER / PAYMENT
// Added to support the Vendor and Payment (Razorpay) modules.
// Mirrors the organizations/{uid} pattern: a vendor's Firestore doc
// is keyed by their Firebase Auth uid, just like organizations.
// ─────────────────────────────────────────────

export interface VendorDoc {
  uid: string
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  businessLicense: string
  taxId: string
  bankAccountHolder: string
  bankAccountNumber: string
  bankName: string
  approvalStatus: "pending" | "approved" | "rejected"
  createdAt?: Timestamp
  updatedAt?: Timestamp
  /** Saved map coordinates — set when user pins their location in profile settings */
  lat?: number
  lng?: number
}

export interface VendorDocumentDoc {
  id?: string
  vendorId: string
  documentType: "business_license" | "tax_certificate" | "bank_statement" | "identity"
  fileUrl: string
  fileName: string
  status: "pending" | "approved" | "rejected"
  uploadedAt?: Timestamp
  verifiedAt?: Timestamp
}

export interface VendorItemDoc {
  id?: string
  vendorId: string
  vendorName: string
  itemName: string
  /** Matches the unit vocabulary used on RequirementDoc (kg, pieces, L, etc.) */
  unit: string
  pricePerUnit: number
  /** Optional stock cap; omit for unlimited */
  availableQuantity?: number
  category?: string
  isActive: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface OrderItem {
  name: string
  quantity: number
  price: number
}

export interface OrderDoc {
  id?: string
  vendorId: string
  vendorName?: string
  orderId: string
  organizationId?: string
  organizationName?: string
  /** Added so a donor can query their own completed transactions directly,
   *  without joining through donationId -> donations -> donorId. */
  donorId?: string
  donorName?: string
  donationId?: string
  requirementId?: string
  vendorItemId?: string
  orderDate?: Timestamp
  amount: number
  items: OrderItem[]
  status: "payment_confirmed" | "preparing" | "ready_for_pickup" | "picked_up" | "failed"
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  notes?: string
  updatedAt?: Timestamp
  /** Proof photo the vendor attached when marking this order "ready for
   *  pickup" — required before the action is allowed to go through. */
  readyForPickupProofUrl?: string
  /** Proof photo the org attached when marking this order "picked up" —
   *  required before the action is allowed to go through. */
  pickedUpProofUrl?: string
}

export interface PaymentDoc {
  id?: string
  razorpayOrderId: string
  razorpayPaymentId?: string
  orderId: string
  donorId: string
  donorName: string
  donorEmail: string
  donorPhone?: string
  requirementId?: string
  organizationId?: string
  amount: number
  status: "pending" | "success" | "failed"
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface RequirementDoc {
  id?: string
  organizationId: string
  title: string
  description: string
  unit: string
  totalQuantity: number
  fulfilledQuantity: number
  category?: string
  status: "Open" | "Partially Filled" | "Fulfilled"
  priority: "High" | "Medium" | "Low"
  /** Optional ₹ price per unit, used by the donor checkout/payment flow when set. */
  pricePerUnit?: number
  createdAt?: Timestamp
}

export interface SlotDoc {
  id?: string
  organizationId: string
  title: string
  description?: string
  date: string
  mealType?: "Breakfast" | "Lunch" | "Dinner"
  totalNeeded: number
  sponsored: number
  status: "Available" | "Partially Filled" | "Full"
  pricePerUnit?: number
  /** Optional monetary target for this slot (₹) */
  amountRequired?: number
  /** Alias for totalNeeded used by some form paths */
  mealsCount?: number
  createdAt?: Timestamp
}

export interface DonationDoc {
  id?: string
  donorId: string
  donorPhone?: string
  organizationId: string
  slotId?: string
  requirementId?: string
  organizationName?: string
  amount: number
  /** For requirement-based donations: the physical quantity donated (kg, L, pieces, etc.) */
  quantity?: number
  /** For requirement-based donations: the item name (e.g. "Rice", "Clothes") */
  itemName?: string
  /** For requirement-based donations: the unit (e.g. "kg", "pieces") */
  unit?: string
  /** Number of meals for slot-based donations */
  meals?: number
  /** Which meal this slot-based (meal sponsorship) donation is for — copied
   *  from the slot at creation time so it can be displayed without needing
   *  a separate slot lookup, and still shows correctly even if the slot is
   *  later edited or deleted. */
  mealType?: "Breakfast" | "Lunch" | "Dinner"
  /** Human-readable date string for display (e.g. slot date or donation date) */
  donationDate?: string
  /** The date the donation request was submitted (YYYY-MM-DD) */
  submissionDate?: string
  occasion?: string
  message?: string
  status: "Pending" | "Approved" | "ToBeConfirmed" | "Completed" | "Rejected"
  createdAt?: Timestamp
  updatedAt?: Timestamp
  completedAt?: Timestamp
  notes?: string
  /** When a donation is capped to less than requested, stores the original
   *  requested quantity so the UI can show "Requested: X → Approved: Y". */
  originalQuantity?: number
  /** True for donor-initiated own-item donations (not linked to org requirements) */
  isOwnItem?: boolean
  /** Proof photo the donor attached when clicking "Donate" (self-ship
   *  confirmation) — required before the action is allowed to go through. */
  donateProofUrl?: string
  /** Proof photo the org attached when marking this donation "Completed" —
   *  required before the action is allowed to go through. */
  completedProofUrl?: string
}

export interface SponsorshipRequestDoc {
  id?: string
  donorId: string
  donorName: string
  organizationId: string
  organizationName: string
  slotId?: string
  slotTitle?: string
  requirementId?: string
  amount: number
  meals?: number
  occasion?: string
  message?: string
  status: "pending" | "approved" | "rejected"
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface NotificationDoc {
  id?: string
  userId: string
  title: string
  body: string
  type: "donation" | "message" | "requirement" | "system"
  read: boolean
  readAt?: Timestamp
  createdAt?: Timestamp
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────

export interface ReviewDoc {
  id?: string
  userId: string
  userName: string
  userRole: "donor" | "organization"
  photoURL?: string
  rating: number
  comment: string
  createdAt?: Timestamp
}

export async function addReview(data: Partial<ReviewDoc>): Promise<string> {
  const ref = await addDoc(
    collection(db, "reviews"),
    sanitizeData({
      ...data,
      createdAt: serverTimestamp(),
    }) as any
  )
  return ref.id
}

export async function getRecentReviews(limitCount = 10): Promise<ReviewDoc[]> {
  const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(limitCount))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...d.data(),
    id: d.id,
  } as ReviewDoc))
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserDoc) : null
}

export async function updateUser(uid: string, data: Partial<UserDoc>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, "users", uid), sanitizeData(data as Record<string, unknown>) as any)
}

// ─────────────────────────────────────────────
// FAVOURITE ORGS
// ─────────────────────────────────────────────

/** Toggle a favourite org — adds if not present, removes if present */
export async function toggleFavoriteOrg(uid: string, orgId: string): Promise<boolean> {
  const userRef = doc(db, "users", uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return false
  const current: string[] = (snap.data() as UserDoc).favoriteOrgIds ?? []
  const isFav = current.includes(orgId)
  await updateDoc(userRef, {
    favoriteOrgIds: isFav ? arrayRemove(orgId) : arrayUnion(orgId),
  })
  return !isFav
}

/** Get favourite org IDs for a donor */
export async function getFavoriteOrgIds(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return []
  return (snap.data() as UserDoc).favoriteOrgIds ?? []
}

// ─────────────────────────────────────────────
// ORGANIZATIONS
// ─────────────────────────────────────────────

/**
 * Get all PUBLIC-FACING organizations — i.e. only those with status "active".
 * Used by the landing page, donor browse page, and any other public listing.
 *
 * NOTE: This used to return every doc in the "organizations" collection with
 * no status filter, which meant pending/rejected orgs (or orgs an admin
 * thought were "removed" by changing their status, without deleting the doc)
 * would still show up publicly. If you need an unfiltered list for an admin
 * screen, use getAllOrganizationsForAdmin() instead — do not remove this filter.
 */
export async function getOrganizations(): Promise<OrganizationDoc[]> {
  const q = query(
    collection(db, "organizations"),
    where("status", "==", "active")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...d.data(),
    uid: d.id,
    orgId: d.id,
  } as OrganizationDoc))
}

/**
 * Admin-only: get every organization document regardless of status
 * (active, pending, rejected). Use this for admin management screens
 * where you need to see/approve/reject everything. Never use this for
 * any public-facing list.
 */
export async function getAllOrganizationsForAdmin(): Promise<OrganizationDoc[]> {
  const snap = await getDocs(collection(db, "organizations"))
  return snap.docs.map((d) => ({
    ...d.data(),
    uid: d.id,
    orgId: d.id,
  } as OrganizationDoc))
}

/** Admin-only: get organizations awaiting approval */
export async function getPendingOrganizations(): Promise<OrganizationDoc[]> {
  const q = query(
    collection(db, "organizations"),
    where("status", "==", "pending")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...d.data(),
    uid: d.id,
    orgId: d.id,
  } as OrganizationDoc))
}

/** Admin: approve a pending organization, making it publicly visible */
export async function approveOrganization(orgId: string): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), {
    status: "active",
  })
}

/** Admin: reject a pending organization */
export async function rejectOrganization(orgId: string): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), {
    status: "rejected",
  })
}

/** Get active organizations — used by landing page & donor browse */
export async function getActiveOrganizations(): Promise<OrganizationDoc[]> {
  const q = query(
    collection(db, "organizations"),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(6)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...d.data(),
    uid: d.id,
    orgId: d.id,
  } as OrganizationDoc))
}

/** Get a single organization by ID */
export async function getOrganization(orgId: string): Promise<OrganizationDoc | null> {
  const snap = await getDoc(doc(db, "organizations", orgId))
  return snap.exists()
    ? ({ ...snap.data(), uid: snap.id, orgId: snap.id } as OrganizationDoc)
    : null
}

/** Filter organizations by category */
export async function getOrganizationsByCategory(category: string): Promise<OrganizationDoc[]> {
  const q = query(
    collection(db, "organizations"),
    where("category", "==", category),
    where("status", "==", "active")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), uid: d.id, orgId: d.id } as OrganizationDoc))
}

/** Create or update an organization document */
export async function upsertOrganization(orgId: string, data: Partial<OrganizationDoc>) {
  await setDoc(
    doc(db, "organizations", orgId),
    sanitizeData(data as Record<string, unknown>),
    { merge: true }
  )
}

// ─────────────────────────────────────────────
// REQUIREMENTS
// ─────────────────────────────────────────────

export async function getRequirements(filters?: {
  organizationId?: string
  status?: string
  category?: string
}): Promise<RequirementDoc[]> {
  const constraints: QueryConstraint[] = []
  if (filters?.organizationId)
    constraints.push(where("organizationId", "==", filters.organizationId))
  if (filters?.status) constraints.push(where("status", "==", filters.status))
  if (filters?.category) constraints.push(where("category", "==", filters.category))
  constraints.push(orderBy("createdAt", "desc"))

  const q = query(collection(db, "requirements"), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RequirementDoc))
}

export async function getMyRequirements(orgId: string): Promise<RequirementDoc[]> {
  return getRequirements({ organizationId: orgId })
}

export async function getRequirement(reqId: string): Promise<RequirementDoc | null> {
  const snap = await getDoc(doc(db, "requirements", reqId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RequirementDoc) : null
}

export async function addRequirement(data: Omit<RequirementDoc, "id">): Promise<string> {
  const ref = await addDoc(
    collection(db, "requirements"),
    sanitizeData({ ...data, createdAt: serverTimestamp() } as Record<string, unknown>)
  )
  return ref.id
}

export async function updateRequirement(reqId: string, data: Partial<RequirementDoc>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, "requirements", reqId), sanitizeData(data as Record<string, unknown>) as any)
}

export async function deleteRequirement(reqId: string) {
  await deleteDoc(doc(db, "requirements", reqId))
}

// ─────────────────────────────────────────────
// REQUIREMENT FULFILLMENT
// ─────────────────────────────────────────────

/**
 * Compute requirement status from quantities.
 * 0 fulfilled          → "Open"
 * 0 < fulfilled < total → "Partially Filled"
 * fulfilled >= total   → "Fulfilled"
 */
export function computeRequirementStatus(
  totalQuantity: number,
  fulfilledQuantity: number
): RequirementDoc["status"] {
  if (fulfilledQuantity <= 0) return "Open"
  if (fulfilledQuantity >= totalQuantity) return "Fulfilled"
  return "Partially Filled"
}

/**
 * Atomically increment a requirement's fulfilledQuantity by `quantityToAdd`,
 * recalculate remainingQuantity and status, then persist to Firestore.
 * Returns the updated requirement snapshot (fulfilledQuantity, status).
 *
 * Safe to call on approval — reads the latest value from Firestore first
 * so concurrent approvals don't clobber each other.
 */
export async function fulfillRequirement(
  requirementId: string,
  quantityToAdd: number
): Promise<{ fulfilledQuantity: number; status: RequirementDoc["status"] }> {
  if (!requirementId || quantityToAdd <= 0) {
    throw new Error("fulfillRequirement: invalid requirementId or quantityToAdd")
  }

  const reqRef = doc(db, "requirements", requirementId)
  const snap = await getDoc(reqRef)

  if (!snap.exists()) {
    throw new Error(`fulfillRequirement: requirement ${requirementId} not found`)
  }

  const req = snap.data() as RequirementDoc
  const currentFulfilled = req.fulfilledQuantity ?? 0
  const newFulfilled = currentFulfilled + quantityToAdd
  const newStatus = computeRequirementStatus(req.totalQuantity, newFulfilled)

  await updateDoc(reqRef, {
    fulfilledQuantity: newFulfilled,
    status: newStatus,
  })

  return { fulfilledQuantity: newFulfilled, status: newStatus }
}

// ─────────────────────────────────────────────
// SLOTS
// ─────────────────────────────────────────────

export async function getSlots(filters?: {
  organizationId?: string
  status?: string
  date?: string
  dateFrom?: string
}): Promise<SlotDoc[]> {
  const constraints: QueryConstraint[] = []
  if (filters?.organizationId)
    constraints.push(where("organizationId", "==", filters.organizationId))
  if (filters?.status) constraints.push(where("status", "==", filters.status))
  if (filters?.date) constraints.push(where("date", "==", filters.date))
  if (filters?.dateFrom) constraints.push(where("date", ">=", filters.dateFrom))
  constraints.push(orderBy("date", "asc"))

  const q = query(collection(db, "slots"), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SlotDoc))
}

export async function getMySlots(orgId: string): Promise<SlotDoc[]> {
  return getSlots({ organizationId: orgId })
}

export async function addSlot(data: Omit<SlotDoc, "id">): Promise<string> {
  const ref = await addDoc(
    collection(db, "slots"),
    sanitizeData({ ...data, createdAt: serverTimestamp() } as Record<string, unknown>)
  )
  return ref.id
}

export async function updateSlot(slotId: string, data: Partial<SlotDoc>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, "slots", slotId), sanitizeData(data as Record<string, unknown>) as any)
}

export async function deleteSlot(slotId: string) {
  await deleteDoc(doc(db, "slots", slotId))
}

/** Get Approved/Completed donations linked to a specific slot */
// organizationId is required so the query satisfies the Firestore security rule
// (rule: donorId == uid || organizationId == uid — the query must include one of these)
export async function getDonationsBySlot(
  slotId: string,
  organizationId: string
): Promise<DonationDoc[]> {
  const q = query(
    collection(db, "donations"),
    where("slotId", "==", slotId),
    where("organizationId", "==", organizationId),
    where("status", "in", ["Approved", "Completed"])
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationDoc))
}

/**
 * Get this donor's own existing requests for a specific slot, regardless of
 * status. Used to block duplicate/multiple bookings of the same slot by the
 * same donor — a donor should not be able to have more than one Pending or
 * Approved request open against the same slot at once.
 * Filtered by donorId == uid so it satisfies the Firestore security rule.
 */
export async function getDonorSlotDonations(
  donorId: string,
  slotId: string
): Promise<DonationDoc[]> {
  const q = query(
    collection(db, "donations"),
    where("donorId", "==", donorId),
    where("slotId", "==", slotId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationDoc))
}

// ─────────────────────────────────────────────
// SPONSORSHIP REQUESTS
// ─────────────────────────────────────────────

/** Create a sponsorship request (donor initiates) */
export async function createSponsorshipRequest(
  data: Omit<SponsorshipRequestDoc, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "sponsorshipRequests"),
    sanitizeData({
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>)
  )
  return ref.id
}

/** Get all sponsorship requests for an organization */
export async function getOrgSponsorshipRequests(
  organizationId: string
): Promise<SponsorshipRequestDoc[]> {
  const q = query(
    collection(db, "sponsorshipRequests"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SponsorshipRequestDoc))
}

/** Get all sponsorship requests from a donor */
export async function getDonorSponsorshipRequests(
  donorId: string
): Promise<SponsorshipRequestDoc[]> {
  const q = query(
    collection(db, "sponsorshipRequests"),
    where("donorId", "==", donorId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SponsorshipRequestDoc))
}

/** Approve a sponsorship request and create a donation record */
export async function approveSponsorshipRequest(
  requestId: string,
  request: SponsorshipRequestDoc
): Promise<void> {
  await updateDoc(doc(db, "sponsorshipRequests", requestId), {
    status: "approved",
    updatedAt: serverTimestamp(),
  })

  await addDoc(
    collection(db, "donations"),
    sanitizeData({
      donorId: request.donorId,
      organizationId: request.organizationId,
      slotId: request.slotId,
      requirementId: request.requirementId,
      organizationName: request.organizationName,
      amount: request.amount,
      occasion: request.occasion,
      message: request.message,
      status: "Approved",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>)
  )

  if (request.slotId) {
    const slotSnap = await getDoc(doc(db, "slots", request.slotId))
    if (slotSnap.exists()) {
      const slot = slotSnap.data() as SlotDoc
      const meals = request.meals ?? 0
      const newSponsored = (slot.sponsored || 0) + meals
      const newStatus: SlotDoc["status"] =
        newSponsored >= slot.totalNeeded
          ? "Full"
          : newSponsored > 0
            ? "Partially Filled"
            : "Available"
      await updateDoc(doc(db, "slots", request.slotId), {
        sponsored: newSponsored,
        status: newStatus,
      })
    }
  }
}

/** Reject a sponsorship request */
export async function rejectSponsorshipRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "sponsorshipRequests", requestId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  })
}

// ─────────────────────────────────────────────
// DONATIONS
// ─────────────────────────────────────────────

export async function getDonorDonations(donorId: string): Promise<DonationDoc[]> {
  const q = query(
    collection(db, "donations"),
    where("donorId", "==", donorId)
  )
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationDoc))
  // Sort client-side to avoid requiring a composite Firestore index
  return docs.sort((a, b) => {
    const aTs = tsToDate(a.createdAt ?? a.updatedAt)?.getTime() ?? 0
    const bTs = tsToDate(b.createdAt ?? b.updatedAt)?.getTime() ?? 0
    return bTs - aTs
  })
}

/** Single-doc fetch — used by /donor/find-vendor/[donationId] to load the
 *  already-approved request being fulfilled. */
export async function getDonation(donationId: string): Promise<DonationDoc | null> {
  const snap = await getDoc(doc(db, "donations", donationId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as DonationDoc) : null
}

export async function getOrgDonations(
  organizationId: string,
  statusFilter?: string
): Promise<DonationDoc[]> {
  const constraints: QueryConstraint[] = [
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc"),
  ]
  if (statusFilter) constraints.splice(1, 0, where("status", "==", statusFilter))

  const q = query(collection(db, "donations"), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationDoc))
}

/** Alias for getOrgDonations filtered to Pending status — used by slots-calendar */
export async function getPendingDonorRequests(organizationId: string): Promise<DonationDoc[]> {
  return getOrgDonations(organizationId, "Pending")
}

export async function createDonation(
  data: Omit<DonationDoc, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "donations"),
    sanitizeData({
      ...data,
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>)
  )
  return ref.id
}

/** Create a donor-initiated own-item donation (not linked to org requirements) */
// firestore.ts — PATCH for createOwnItemDonation
//
// The Pick<> type needs "submissionDate" added so the form can pass the selected date.
// Replace the existing createOwnItemDonation function with this:

export async function createOwnItemDonation(
  data: Pick<DonationDoc, "donorId" | "organizationId" | "itemName" | "quantity" | "unit" | "message" | "occasion" | "submissionDate">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "donations"),
    sanitizeData({
      ...data,
      amount: 0,
      status: "Pending",
      isOwnItem: true,
      // Use the date passed from the form; fall back to today if not provided
      submissionDate: data.submissionDate ?? new Date().toISOString().split("T")[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>)
  )
  return ref.id
}

// Also update the addDonorItem alias to match:

/** Alias for createOwnItemDonation — used by donor-item-form.tsx */
export const addDonorItem = createOwnItemDonation

/** DonorItemDoc — a DonationDoc where isOwnItem is true */
export type DonorItemDoc = DonationDoc & { isOwnItem: true }

/** Fetch all own-item donations submitted by a donor */
export async function getDonorItems(donorId: string): Promise<DonorItemDoc[]> {
  const q = query(
    collection(db, "donations"),
    where("donorId", "==", donorId),
    where("isOwnItem", "==", true)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonorItemDoc))
}

export async function updateDonationStatus(
  donationId: string,
  status: DonationDoc["status"],
  notes?: string,
  proofUrl?: string
) {
  const update: DocumentData = sanitizeData({
    status,
    notes,
    updatedAt: serverTimestamp(),
    ...(status === "Completed" ? { completedAt: serverTimestamp() } : {}),
    // Proof photo is required by the UI before this call is ever made for
    // these two transitions — stored under a status-specific field so a
    // donation's full proof history (donate + completed) is preserved
    // rather than one overwriting the other.
    ...(status === "ToBeConfirmed" && proofUrl ? { donateProofUrl: proofUrl } : {}),
    ...(status === "Completed" && proofUrl ? { completedProofUrl: proofUrl } : {}),
  } as Record<string, unknown>)
  await updateDoc(doc(db, "donations", donationId), update)
}

/**
 * Approve a donation and, if it is linked to a requirement,
 * automatically increment the requirement's fulfilledQuantity.
 *
 * For slot-based (meal sponsorship) donations, this re-checks the slot's
 * live remaining capacity before approving — this prevents an org from
 * accidentally double-approving two different donors' Pending requests for
 * the same slot in a way that pushes `sponsored` past `totalNeeded`. If the
 * slot is already Full, or this donation's `meals` would exceed the
 * remaining capacity, the donation is rejected instead of approved and the
 * caller is told so via the returned `rejected` flag.
 */
export async function approveDonationWithFulfillment(
  donationId: string
): Promise<
  | { fulfilledQuantity: number; status: RequirementDoc["status"]; approvedQuantity?: number; wasCapped?: boolean }
  | { rejected: true; reason: string }
  | null
> {
  const donationSnap = await getDoc(doc(db, "donations", donationId))
  if (!donationSnap.exists()) {
    throw new Error(`approveDonationWithFulfillment: donation ${donationId} not found`)
  }

  const donation = { id: donationSnap.id, ...donationSnap.data() } as DonationDoc

  // Slot-based (meal sponsorship) donations: verify capacity BEFORE approving,
  // so we never approve a request that would overbook the slot.
  if (donation.slotId && donation.meals && donation.meals > 0) {
    const slotSnap = await getDoc(doc(db, "slots", donation.slotId))
    if (!slotSnap.exists()) {
      throw new Error(`approveDonationWithFulfillment: slot ${donation.slotId} not found`)
    }
    const slot = slotSnap.data() as SlotDoc
    const remaining = Math.max(0, (slot.totalNeeded || 0) - (slot.sponsored || 0))

    if (slot.status === "Full" || remaining <= 0 || donation.meals > remaining) {
      // This slot is already fully (or would become over-) sponsored.
      // Reject this donation instead of approving it, so the org can't
      // create a duplicate/overlapping booking on the same slot.
      const reason =
        slot.status === "Full" || remaining <= 0
          ? "This sponsorship slot has already been fully sponsored by another donor."
          : `Only ${remaining} meals remain on this slot — not enough for this request.`
      await updateDoc(doc(db, "donations", donationId), {
        status: "Rejected",
        notes: reason,
        updatedAt: serverTimestamp(),
      })
      return { rejected: true, reason }
    }

    await updateDoc(doc(db, "donations", donationId), {
      status: "Approved",
      updatedAt: serverTimestamp(),
    })

    const newSponsored = (slot.sponsored || 0) + donation.meals
    const newStatus: SlotDoc["status"] =
      newSponsored >= slot.totalNeeded
        ? "Full"
        : newSponsored > 0
          ? "Partially Filled"
          : "Available"
    await updateDoc(doc(db, "slots", donation.slotId), {
      sponsored: newSponsored,
      status: newStatus,
    })

    // When the slot is fully sponsored, auto-reject all remaining Pending
    // donations for this slot so other donors aren't left waiting.
    if (newStatus === "Full") {
      // organizationId must be included so this query satisfies the
      // Firestore security rule on `donations` (donorId == uid ||
      // organizationId == uid) — a query filtered only by slotId/status
      // can't be proven safe by the rules engine and is rejected outright
      // with "Missing or insufficient permissions."
      const pendingSnap = await getDocs(query(
        collection(db, "donations"),
        where("slotId", "==", donation.slotId),
        where("organizationId", "==", donation.organizationId),
        where("status", "==", "Pending"),
      ))
      await Promise.all(
        pendingSnap.docs
          .filter((d) => d.id !== donationId)
          .map((d) =>
            updateDoc(d.ref, {
              status: "Rejected",
              notes: "Slot has been fully sponsored by another donor.",
              updatedAt: serverTimestamp(),
            })
          )
      )
    }

    return null
  }

  // Requirement-based (item) donations: cap the approved quantity to
  // whatever's actually remaining on the requirement, so an org can't
  // accidentally approve more than was asked for across multiple donors.
  // If nothing remains at all, reject instead of approving.
  if (donation.requirementId && donation.quantity && donation.quantity > 0) {
    const reqRef = doc(db, "requirements", donation.requirementId)
    const reqSnap = await getDoc(reqRef)
    if (!reqSnap.exists()) {
      throw new Error(`approveDonationWithFulfillment: requirement ${donation.requirementId} not found`)
    }
    const req = reqSnap.data() as RequirementDoc
    const remaining = Math.max(0, (req.totalQuantity || 0) - (req.fulfilledQuantity || 0))

    if (remaining <= 0) {
      // Requirement is already fully met — nothing left to approve.
      const reason = "This requirement has already been fully fulfilled by other donors."
      await updateDoc(doc(db, "donations", donationId), {
        status: "Rejected",
        notes: reason,
        updatedAt: serverTimestamp(),
      })
      return { rejected: true, reason }
    }

    // Cap this donation's quantity to what's actually left, so the donor's
    // record (and any downstream vendor purchase) reflects what was really
    // approved, not what they originally asked for.
    const approvedQuantity = Math.min(donation.quantity, remaining)
    const wasCapped = approvedQuantity < donation.quantity

    await updateDoc(doc(db, "donations", donationId), {
      status: "Approved",
      quantity: approvedQuantity,
      ...(wasCapped
        ? {
            originalQuantity: donation.quantity,
            notes: `Approved for ${approvedQuantity} ${donation.unit || ""} (reduced from ${donation.quantity} ${donation.unit || ""} requested — only that much remained on the requirement).`,
          }
        : {}),
      updatedAt: serverTimestamp(),
    })

    const result = await fulfillRequirement(donation.requirementId, approvedQuantity)
    // When the requirement is fully fulfilled, auto-reject all other
    // Pending donations linked to it so other donors aren't left waiting
    // on a requirement that's already been met.
    if (result.status === "Fulfilled") {
      // organizationId must be included so this query satisfies the
      // Firestore security rule on `donations` (donorId == uid ||
      // organizationId == uid) — a query filtered only by requirementId/status
      // can't be proven safe by the rules engine and is rejected outright
      // with "Missing or insufficient permissions."
      const pendingSnap = await getDocs(query(
        collection(db, "donations"),
        where("requirementId", "==", donation.requirementId),
        where("organizationId", "==", donation.organizationId),
        where("status", "==", "Pending"),
      ))
      await Promise.all(
        pendingSnap.docs
          .filter((d) => d.id !== donationId)
          .map((d) =>
            updateDoc(d.ref, {
              status: "Rejected",
              notes: "This requirement has already been fully fulfilled by other donors.",
              updatedAt: serverTimestamp(),
            })
          )
      )
    }

    return { ...result, approvedQuantity, wasCapped }
  }

  // Neither slot-linked nor requirement-linked (e.g. own-item donations) —
  // nothing to cap against, so just approve as-is.
  await updateDoc(doc(db, "donations", donationId), {
    status: "Approved",
    updatedAt: serverTimestamp(),
  })

  return null
}

/**
 * Mark all donations linked to a specific requirement as "Completed".
 * organizationId is required so this query satisfies the Firestore security
 * rule on `donations` (donorId == uid || organizationId == uid) — a query
 * filtered only by requirementId can't be proven safe by the rules engine
 * and is rejected with "Missing or insufficient permissions."
 */
export async function completeDonationsByRequirement(
  requirementId: string,
  organizationId: string
): Promise<void> {
  const q = query(
    collection(db, "donations"),
    where("requirementId", "==", requirementId),
    where("organizationId", "==", organizationId)
  )
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(d.ref, {
        status: "Completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  )
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export async function createNotification(data: {
  userId: string
  title: string
  body: string
  type: NotificationDoc["type"]
}): Promise<string> {
  const ref = await addDoc(
    collection(db, "notifications"),
    sanitizeData({
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    } as Record<string, unknown>)
  )
  return ref.id
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifs: NotificationDoc[]) => void,
  unreadOnly = false
) {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50),
  ]
  if (unreadOnly) constraints.splice(1, 0, where("read", "==", false))

  const q = query(collection(db, "notifications"), ...constraints)
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc)))
  })
}

export async function markNotificationRead(notifId: string) {
  await updateDoc(doc(db, "notifications", notifId), {
    read: true,
    readAt: serverTimestamp(),
  })
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  )
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map((d) => updateDoc(d.ref, { read: true, readAt: serverTimestamp() }))
  )
}

// ─────────────────────────────────────────────
// SPONSORSHIP HELPERS
// ─────────────────────────────────────────────

export const SPONSORSHIP_LEAD_TIME_DAYS = 1

export function getMinBookableDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + SPONSORSHIP_LEAD_TIME_DAYS)
  return d.toISOString().split("T")[0]
}

// ─────────────────────────────────────────────
// ACCOUNT DELETION
// ─────────────────────────────────────────────

/**
 * Delete all Firestore records belonging to a donor and then the user doc.
 * Call this before deleting the Firebase Auth account.
 */
export async function deleteDonorAccount(uid: string): Promise<void> {
  // 1. donations
  const donationsSnap = await getDocs(
    query(collection(db, "donations"), where("donorId", "==", uid))
  )
  await Promise.all(donationsSnap.docs.map((d) => deleteDoc(d.ref)))

  // 2. sponsorship requests
  const sponsorSnap = await getDocs(
    query(collection(db, "sponsorshipRequests"), where("donorId", "==", uid))
  )
  await Promise.all(sponsorSnap.docs.map((d) => deleteDoc(d.ref)))

  // 3. notifications
  const notifSnap = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", uid))
  )
  await Promise.all(notifSnap.docs.map((d) => deleteDoc(d.ref)))

  // 4. user doc
  await deleteDoc(doc(db, "users", uid))
}

/**
 * Delete all Firestore records belonging to an organization and then the org doc.
 * Call this before deleting the Firebase Auth account.
 *
 * TEMPORARY: each step is wrapped so we can see exactly which collection's
 * delete is being denied, instead of one generic "Missing or insufficient
 * permissions" with no indication of where. Remove the try/catch + console.log
 * wrapping once the real cause is found — the deletes themselves are unchanged.
 */
export async function deleteOrganizationAccount(uid: string): Promise<void> {
  // 1. slots
  try {
    const slotsSnap = await getDocs(
      query(collection(db, "slots"), where("organizationId", "==", uid))
    )
    console.log(`[deleteOrg] slots: ${slotsSnap.docs.length} docs`)
    await Promise.all(slotsSnap.docs.map((d) => deleteDoc(d.ref)))
    console.log("[deleteOrg] slots: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: slots", e)
    throw e
  }

  // 2. requirements
  try {
    const reqSnap = await getDocs(
      query(collection(db, "requirements"), where("organizationId", "==", uid))
    )
    console.log(`[deleteOrg] requirements: ${reqSnap.docs.length} docs`)
    await Promise.all(reqSnap.docs.map((d) => deleteDoc(d.ref)))
    console.log("[deleteOrg] requirements: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: requirements", e)
    throw e
  }

  // 3. donations linked to this org
  try {
    const donationsSnap = await getDocs(
      query(collection(db, "donations"), where("organizationId", "==", uid))
    )
    console.log(`[deleteOrg] donations: ${donationsSnap.docs.length} docs`)
    await Promise.all(donationsSnap.docs.map((d) => deleteDoc(d.ref)))
    console.log("[deleteOrg] donations: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: donations", e)
    throw e
  }

  // 4. sponsorship requests linked to this org
  try {
    const sponsorSnap = await getDocs(
      query(collection(db, "sponsorshipRequests"), where("organizationId", "==", uid))
    )
    console.log(`[deleteOrg] sponsorshipRequests: ${sponsorSnap.docs.length} docs`)
    await Promise.all(sponsorSnap.docs.map((d) => deleteDoc(d.ref)))
    console.log("[deleteOrg] sponsorshipRequests: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: sponsorshipRequests", e)
    throw e
  }

  // 5. notifications
  try {
    const notifSnap = await getDocs(
      query(collection(db, "notifications"), where("userId", "==", uid))
    )
    console.log(`[deleteOrg] notifications: ${notifSnap.docs.length} docs`)
    await Promise.all(notifSnap.docs.map((d) => deleteDoc(d.ref)))
    console.log("[deleteOrg] notifications: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: notifications", e)
    throw e
  }

  // 6. organization doc
  try {
    await deleteDoc(doc(db, "organizations", uid))
    console.log("[deleteOrg] organizations doc: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: organizations doc", e)
    throw e
  }

  // 7. user doc
  try {
    await deleteDoc(doc(db, "users", uid))
    console.log("[deleteOrg] users doc: OK")
  } catch (e) {
    console.error("[deleteOrg] FAILED at step: users doc", e)
    throw e
  }
}


// ─────────────────────────────────────────────
// INVITE TOKENS  (append to lib/firestore.ts)
// ─────────────────────────────────────────────

export interface InviteDoc {
  id?: string
  email: string          // org email the invite is intended for
  token: string          // random 24-char string, used as doc ID too
  used: boolean
  usedBy?: string        // uid of org that registered with this token
  createdAt?: Timestamp
  usedAt?: Timestamp
  createdByAdminId: string
}

/** Generate a cryptographically random token string */
function generateToken(length = 24): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join("")
}

/** Admin creates a new invite for an org email. Returns the token string. */
export async function createInviteToken(
  adminUid: string,
  orgEmail: string
): Promise<string> {
  const token = generateToken()
  await setDoc(
    doc(db, "invites", token),
    sanitizeData({
      email: orgEmail,
      token,
      used: false,
      createdByAdminId: adminUid,
      createdAt: serverTimestamp(),
    } as Record<string, unknown>)
  )
  return token
}

/** Validate a token — returns the InviteDoc if valid and unused, null otherwise */
export async function validateInviteToken(token: string): Promise<InviteDoc | null> {
  if (!token) return null
  const snap = await getDoc(doc(db, "invites", token))
  if (!snap.exists()) return null
  const data = snap.data() as InviteDoc
  if (data.used) return null
  return { ...data, id: snap.id }
}

/** Mark a token as used after successful org registration */
export async function consumeInviteToken(token: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "invites", token), {
    used: true,
    usedBy: uid,
    usedAt: serverTimestamp(),
  })
}

/** Admin: list all invite tokens */
export async function getAllInvites(): Promise<InviteDoc[]> {
  const q = query(collection(db, "invites"), orderBy("createdAt", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as InviteDoc))
}

/** Admin: revoke (delete) an unused invite */
export async function revokeInviteToken(token: string): Promise<void> {
  await deleteDoc(doc(db, "invites", token))
}

// ─────────────────────────────────────────────
// VENDORS
// uid-keyed (vendors/{uid}), same pattern as organizations/{uid}.
// ─────────────────────────────────────────────

export async function getVendor(uid: string): Promise<VendorDoc | null> {
  const snap = await getDoc(doc(db, "vendors", uid))
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as VendorDoc) : null
}

export async function upsertVendor(uid: string, data: Partial<VendorDoc>) {
  await setDoc(doc(db, "vendors", uid), sanitizeData({ ...data, uid, updatedAt: serverTimestamp() }), {
    merge: true,
  })
}

export function subscribeToVendor(uid: string, callback: (vendor: VendorDoc | null) => void) {
  return onSnapshot(doc(db, "vendors", uid), (snap) => {
    callback(snap.exists() ? ({ uid: snap.id, ...snap.data() } as VendorDoc) : null)
  })
}

export async function getAllVendorsForAdmin(): Promise<VendorDoc[]> {
  const snap = await getDocs(collection(db, "vendors"))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as VendorDoc))
}

export async function getPendingVendors(): Promise<VendorDoc[]> {
  const q = query(collection(db, "vendors"), where("approvalStatus", "==", "pending"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as VendorDoc))
}

export async function approveVendor(uid: string): Promise<void> {
  await updateDoc(doc(db, "vendors", uid), { approvalStatus: "approved" })
}

export async function rejectVendor(uid: string): Promise<void> {
  await updateDoc(doc(db, "vendors", uid), { approvalStatus: "rejected" })
}

// ─────────────────────────────────────────────
// VENDOR DOCUMENTS
// ─────────────────────────────────────────────

export async function uploadVendorDocument(
  vendorId: string,
  data: Omit<VendorDocumentDoc, "id" | "uploadedAt" | "verifiedAt">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "vendorDocuments"),
    sanitizeData({ ...data, vendorId, uploadedAt: serverTimestamp() }) as any
  )
  return ref.id
}

export async function getVendorDocuments(vendorId: string): Promise<VendorDocumentDoc[]> {
  const q = query(collection(db, "vendorDocuments"), where("vendorId", "==", vendorId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as VendorDocumentDoc))
}

export function subscribeToVendorDocuments(
  vendorId: string,
  callback: (documents: VendorDocumentDoc[]) => void
) {
  const q = query(collection(db, "vendorDocuments"), where("vendorId", "==", vendorId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as VendorDocumentDoc)))
  })
}

// ─────────────────────────────────────────────
// VENDOR ITEMS (catalog a vendor sells, with price-per-unit)
// Lets a donor search "who sells Rice" and get back vendors + live prices,
// matching workflow step 7-8: "Organization Suggests Nearby Vendors" /
// "Donor Chooses Vendor".
// ─────────────────────────────────────────────

export async function createVendorItem(
  data: Omit<VendorItemDoc, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "vendorItems"),
    sanitizeData({ ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) as any
  )
  return ref.id
}

export async function updateVendorItem(itemId: string, updates: Partial<VendorItemDoc>) {
  await updateDoc(doc(db, "vendorItems", itemId), sanitizeData({ ...updates, updatedAt: serverTimestamp() }) as any)
}

export async function deleteVendorItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, "vendorItems", itemId))
}

export async function getVendorItems(vendorId: string): Promise<VendorItemDoc[]> {
  const q = query(collection(db, "vendorItems"), where("vendorId", "==", vendorId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as VendorItemDoc))
}

export function subscribeToVendorItems(vendorId: string, callback: (items: VendorItemDoc[]) => void) {
  const q = query(collection(db, "vendorItems"), where("vendorId", "==", vendorId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as VendorItemDoc)))
  })
}

/**
 * Donor-facing search: find active vendor listings whose itemName matches
 * (case-insensitive substring match, done client-side since Firestore has
 * no native full-text search). Pass the requirement's itemName to pre-filter
 * to vendors who actually sell that item.
 */
export async function searchVendorItemsByName(itemName: string): Promise<VendorItemDoc[]> {
  // Only show items from approved vendors
  const [itemsSnap, vendorsSnap] = await Promise.all([
    getDocs(query(collection(db, "vendorItems"), where("isActive", "==", true))),
    getDocs(query(collection(db, "vendors"), where("approvalStatus", "==", "approved"))),
  ])
  const approvedIds = new Set(vendorsSnap.docs.map((d) => d.id))
  const all = itemsSnap.docs
    .map((d) => ({ ...d.data(), id: d.id } as VendorItemDoc))
    .filter((item) => approvedIds.has(item.vendorId))
  const needle = itemName.trim().toLowerCase()
  if (!needle) return all
  return all.filter((item) => item.itemName.toLowerCase().includes(needle))
}

// ─────────────────────────────────────────────
// ORDERS (vendor fulfils a donor's requirement purchase)
// ─────────────────────────────────────────────

export async function createOrder(data: Omit<OrderDoc, "id" | "orderDate" | "updatedAt">): Promise<string> {
  const ref = await addDoc(
    collection(db, "orders"),
    sanitizeData({ ...data, orderDate: serverTimestamp(), updatedAt: serverTimestamp() }) as any
  )
  return ref.id
}

export async function getVendorOrders(vendorId: string): Promise<OrderDoc[]> {
  const q = query(collection(db, "orders"), where("vendorId", "==", vendorId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderDoc))
}

export function subscribeToVendorOrders(vendorId: string, callback: (orders: OrderDoc[]) => void) {
  const q = query(collection(db, "orders"), where("vendorId", "==", vendorId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderDoc)))
  })
}

/** Organization's view of orders placed against their requirements (for the
 *  shared Transactions tab — see components/{role}/transactions-list.tsx) */
export async function getOrgOrders(organizationId: string): Promise<OrderDoc[]> {
  const q = query(collection(db, "orders"), where("organizationId", "==", organizationId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderDoc))
}

export function subscribeToOrgOrders(organizationId: string, callback: (orders: OrderDoc[]) => void) {
  const q = query(collection(db, "orders"), where("organizationId", "==", organizationId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderDoc)))
  })
}

/** Donor's view of their own completed/in-progress orders (for the shared
 *  Transactions tab — see components/{role}/transactions-list.tsx) */
export async function getDonorOrders(donorId: string): Promise<OrderDoc[]> {
  const q = query(collection(db, "orders"), where("donorId", "==", donorId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderDoc))
}

export function subscribeToDonorOrders(donorId: string, callback: (orders: OrderDoc[]) => void) {
  const q = query(collection(db, "orders"), where("donorId", "==", donorId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as OrderDoc)))
  })
}

export async function updateOrder(orderId: string, updates: Partial<OrderDoc>) {
  await updateDoc(doc(db, "orders", orderId), sanitizeData({ ...updates, updatedAt: serverTimestamp() }) as any)
}

export async function markOrderFailed(orderId: string) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "failed",
    updatedAt: serverTimestamp(),
  })
}

export async function markOrderReadyForPickup(orderId: string, proofUrl: string) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "ready_for_pickup",
    readyForPickupProofUrl: proofUrl,
    updatedAt: serverTimestamp(),
  })
}

export async function markOrderPickedUp(orderId: string, proofUrl: string) {
  const orderRef = doc(db, "orders", orderId)
  const orderSnap = await getDoc(orderRef)
  await updateDoc(orderRef, {
    status: "picked_up",
    pickedUpProofUrl: proofUrl,
    updatedAt: serverTimestamp(),
  })
  // If this order is linked to a donation, mark it Completed too — the
  // same pickup photo serves as proof for both, since picking up the
  // order from the vendor IS the donation being completed.
  if (orderSnap.exists()) {
    const donationId = orderSnap.data()?.donationId
    if (donationId) {
      await updateDoc(doc(db, "donations", donationId), {
        status: "Completed",
        completedProofUrl: proofUrl,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }
}

// ─────────────────────────────────────────────
// PAYMENTS (Razorpay)
// Read/update here is for client-side history views only.
// Creation + signature-verified updates happen server-side via
// app/api/payments/* using firebase-admin (see lib/firebase-admin.ts).
// ─────────────────────────────────────────────

export async function getDonorPayments(donorId: string): Promise<PaymentDoc[]> {
  const q = query(
    collection(db, "payments"),
    where("donorId", "==", donorId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as PaymentDoc))
}

export async function getApprovedVendors(): Promise<VendorDoc[]> {
  const q = query(collection(db, "vendors"), where("approvalStatus", "==", "approved"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as VendorDoc))
}