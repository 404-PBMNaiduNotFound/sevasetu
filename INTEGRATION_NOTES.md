# SevaSetu — Vendor + Payment Integration Notes

This zip is the real SevaSetu project (cloned from
https://github.com/404-PBMNaiduNotFound/sevasetu) with the vo.dev-generated
Vendor module and Payment (Razorpay) module merged in and wired to the real
Firebase project, real auth, and real data model. No existing UI was changed —
only logic/wiring needed to make the modules actually function.

## Before you run it

1. `npm install` (already adds `razorpay` to package.json/lock for you)
2. Copy `.env.example` to `.env.local` and fill in:
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from the Razorpay Dashboard
   - `FIREBASE_ADMIN_PROJECT_ID` / `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY`
     — from Firebase Console → Project Settings → Service Accounts → Generate new private key
3. Deploy the updated `firestore.rules` (`firebase deploy --only firestore:rules`)
   — new collections (`vendors`, `vendorDocuments`, `orders`, `payments`) will
   be denied by Firestore until you do this.

## What was added

- **Vendor module**: `/vendor/register`, `/vendor/dashboard`, `/vendor/profile`
  — a vendor signs up with email/password (creates a real Firebase Auth
  account + `vendors/{uid}` Firestore doc, same pattern as organizations),
  logs in through the existing shared `/login` page, and lands in their
  dashboard automatically via the `user_role` cookie + middleware.
- **Payment module**: `/donor/checkout/[requirementId]` and
  `/donor/payments/history` — a Razorpay checkout flow for requirements an
  organization has given a `pricePerUnit`. This is separate from the existing
  `/donor/sponsor` flow (which stays untouched) — it's for direct item
  purchase with real payment, matching workflow steps 9–11 in your diagram.

## What was changed in existing files (and why)

| File | Change | Why |
|---|---|---|
| `lib/firestore.ts` | Added `"vendor"` to `UserRole`; added `VendorDoc`, `VendorDocumentDoc`, `OrderDoc`, `PaymentDoc` types + their query/mutation functions; added `pricePerUnit?` to `RequirementDoc`; added `getRequirement(id)` | The vendor/payment modules need these — none existed before |
| `lib/auth.ts` | Added a `vendor` branch to `registerUser`, and a `vendor` case to `getRedirectPath` | So vendor signup creates a real auth account + redirects correctly, same as org/donor |
| `middleware.ts` | Added `/vendor/:path*` to the matcher + a guard (open only for `/vendor/register`) | Vendor routes were completely unprotected before this |
| `firestore.rules` | Added rule blocks for `vendors`, `vendorDocuments`, `orders`, `payments` | The fallback rule denies everything by default — these collections had zero rules and would fail on every read/write |
| `app/globals.css` | Added 5 CSS vars (`--navy-primary`, `--success-green`, `--action-blue`, `--vendor-orange`, `--donor-purple`) under `:root` and `@theme inline` | The vendor module's Tailwind classes (`bg-action-blue/10`, etc.) reference these — without them the colors silently fail to render |
| `package.json` | Added `razorpay` | Only genuinely new dependency needed (signature verification uses Node's built-in `crypto`, not `crypto-js`) |
| `app/register/page.tsx` | Added a third "I'm a Vendor" card | Additive only — the existing Donor/Organization cards are untouched |
| `app/donor/layout.tsx` | Opted `/donor/checkout` and `/donor/payments` out of `DonorShell` | Both pages ship their own full-bleed header/background (vo.dev design); nesting them in the existing sidebar shell would double up the chrome. Same opt-out pattern already used by `app/org/layout.tsx` for `/org/register`. |
| `components/donor/org-details.tsx` | Added a "Buy & Pay Online" button next to the existing "Donate Now" button, shown only when `req.pricePerUnit` is set | Additive — invisible until an org actually sets a price on a requirement |
| `components/payment/PaymentHistory.tsx` | Added a `where("donorId", "==", ...)` filter | The original component queried the entire `payments` collection unfiltered — every donor could see everyone else's name/email/amount |
| `app/api/payments/*/route.ts` | Rewritten to use `firebase-admin` instead of the client SDK; `verify` route now also advances the linked `donations` doc to `Approved` | Client-SDK writes from an API route would be blocked by `firestore.rules`; admin SDK is the correct server-trusted pattern. Linking back to `donations` makes payment success actually advance the real workflow instead of sitting in an isolated collection. |

## What was deliberately NOT touched

- `lib/firebase.ts` — your real Firebase config, never overwritten
- `components/ui/*` — your real shadcn/Radix primitives kept; the zips'
  `@base-ui`-based versions were discarded entirely
- The existing `/donor/sponsor` no-payment donation flow — untouched
- `package.json`/lockfile versions for anything already present — only
  `razorpay` was added, nothing was bumped or replaced

## Update: Vendor document verification (admin side)

This was added after the initial integration. Previously, vendor documents
were uploaded with a fake placeholder path and nothing in the UI let an
admin review or approve a vendor.

- **`components/admin/vendor-approvals.tsx`** (new) — mirrors the existing
  `components/admin/org-approvals.tsx` pattern exactly, with an added
  "Review documents" expand panel per vendor that fetches and links to
  their uploaded files.
- Wired into `app/admin/dashboard/page.tsx` right below `<OrgApprovals />`.
- **`lib/storage.ts`** — added `uploadVendorDocumentFile()` alongside the
  existing `uploadOrgImage()`, so documents are now genuinely uploaded to
  Firebase Storage (path: `vendors/{vendorId}/documents/{type}-{timestamp}.{ext}`)
  instead of a fake `/uploads/...` string.
- **`app/vendor/register/page.tsx`** — now calls that real upload before
  writing the Firestore `vendorDocuments` doc, so `fileUrl` is a real,
  clickable download URL.

⚠️ **Action needed:** this repo has no `storage.rules` file checked in —
Storage security rules appear to be configured directly in the Firebase
Console, not version-controlled here. Before this goes live, add a rule
allowing a vendor to write to `vendors/{vendorId}/documents/**` (only their
own uid) and allowing admins to read it, e.g.:

```
match /vendors/{vendorId}/documents/{fileName} {
  allow write: if request.auth != null && request.auth.uid == vendorId;
  allow read: if request.auth != null; // tighten to admin-only if you have a custom claim
}
```

Without this, the upload will fail with a permission error in Storage even
though the Firestore rules (already updated) allow the matching Firestore doc.

Also note: approving/rejecting a *vendor* (`approveVendor`/`rejectVendor`)
does not currently mark individual *documents* as verified — `VendorDocumentDoc.status`
stays `"pending"` even after the vendor itself is approved. If you want
per-document verification (not just per-vendor), that would need its own
approve/reject buttons inside the document review panel, calling a new
`verifyVendorDocument(docId)` function (not yet built).

## Update: "Find a Vendor & Pay" flow + shared Transactions tabs

Integrated from a second vo.dev-generated zip. As before, vo.dev correctly
reused the real `lib/firestore.ts` types (`VendorItemDoc`, extended
`OrderDoc`) for most files, but the actual payment step needed real fixes:

- **`components/vendor/find-vendor-step-b.tsx`** — vo.dev's version faked
  payment success by writing directly to the `payments` collection
  client-side (blocked by `firestore.rules`, which only allows server-side
  writes via `firebase-admin`) and referenced an undefined `donationId`
  variable. Rewritten to actually call the real `useRazorpayCheckout` hook
  and the existing `/api/payments/create-order` + `/verify` routes, the same
  way the original checkout flow works.
- **`components/vendor/find-vendor-step-a.tsx`** — vo.dev added a manual
  search box and an editable quantity field, both against the prompt's
  explicit instructions. Fixed to auto-search by the approved request's
  item name on mount, and quantity is now fixed from the donation record
  (never re-entered by the donor).
- **`app/donor/donations/page.tsx`** — vo.dev rewrote this whole 470-line
  page down to 181 lines. Discarded that rewrite; instead grafted just the
  new "Find a Vendor & Pay" button onto the real existing page (shown only
  when `status === "Approved"` and the donation is requirement-linked).
- **New, clean, used as-is**: `/vendor/items` page + `add-item-dialog.tsx` /
  `edit-item-dialog.tsx` / `vendor-items-list.tsx`, `/donor/transactions`,
  `/org/transactions`, `/vendor/transactions`, and the shared
  `components/transactions/transactions-list.tsx` (one fixed import:
  `formatDate` doesn't exist in this project's `lib/utils.ts` — swapped for
  the real `formatFirestoreDate`).
- **`lib/firestore.ts`** — added `getDonation(id)` (single-doc fetch, used
  by the new Find-a-Vendor page).
- **Nav links added** (additive only): "Transactions" in the donor sidebar,
  org sidebar, and vendor layout; "My Items" + "Transactions" in the vendor
  layout. `middleware.ts` already protects all of these via its existing
  `/donor/:path*`, `/org/:path*`, `/vendor/:path*` wildcards — no middleware
  changes were needed this round.

### Two real build-breaking bugs found and fixed via a full `next build`

`tsc --noEmit` alone didn't catch these — both only surfaced when actually
building, because both modules ran code at *module import time* instead of
*request time*:

- **`lib/razorpay.ts`** — was calling `new Razorpay(...)` at the top of the
  file, which threw immediately if `RAZORPAY_KEY_ID`/`SECRET` weren't set,
  even just from Next.js importing the file during build-time page-data
  collection (before any real request happens). Fixed by making it a lazy
  `getRazorpayInstance()` getter — the credential check now only runs when
  a request actually needs to call Razorpay.
- **`lib/firebase-admin.ts`** — same problem, same fix: `adminDb` is now
  `getAdminDb()`, constructed lazily on first real use instead of at import
  time.

**Practical effect of this fix:** you can now run `npm run build` even
before `.env.local` is fully filled in — it will succeed, and the
credential errors will only appear at runtime if someone actually hits the
payment endpoints without the env vars set. Confirmed with a full
`next build` in this session — every route (including all the new ones)
compiled and prerendered successfully.

## Known remaining work (not yet done)

- Full `next build` production check (only `tsc --noEmit` was run and passes
  for every file touched in this integration; two pre-existing, unrelated
  type errors in `app/donor/register/page.tsx` and
  `components/OrgSettingsExample.tsx` were left as-is since they predate this
  work)
- An admin-side UI to approve/reject pending vendors (the data layer function
  `getPendingVendors()` / `approveVendor()` / `rejectVendor()` already exist
  in `lib/firestore.ts`, just no page wired to them yet)
- Real file upload for vendor documents — currently stores a placeholder
  `fileUrl` path; wire to Firebase Storage (`lib/firebase.ts` already
  exports `storage`) when ready
- This was built on a git branch `vendor-payment-integration` — `.git/`
  history wasn't included in this zip, just the working tree
