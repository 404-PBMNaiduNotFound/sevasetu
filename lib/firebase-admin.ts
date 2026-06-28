// lib/firebase-admin.ts
// SERVER-ONLY. Never import this from a "use client" file or a client component.
//
// Used by app/api/payments/* routes to write to Firestore with elevated,
// server-trusted privileges — bypassing firestore.rules safely, because the
// signature verification in lib/razorpay.ts is the real security boundary
// for payment writes, not the client SDK + security rules.
//
// Also used by app/api/admin/set-admin-claim to set custom auth claims
// (via firebase-admin/auth) — that's why getAdminApp() is exported now,
// not just getAdminDb(). Both services share the same initialized App.
//
// Setup: in the Firebase Console go to
//   Project Settings -> Service Accounts -> Generate new private key
// then set these three env vars (e.g. in .env.local / Vercel project settings):
//   FIREBASE_ADMIN_PROJECT_ID
//   FIREBASE_ADMIN_CLIENT_EMAIL
//   FIREBASE_ADMIN_PRIVATE_KEY   (keep the \n escapes; see below)

import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

export function getAdminApp(): App {
  const existing = getApps()
  if (existing.length > 0) return existing[0]

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  // Vercel/most env UIs store newlines as literal "\n" — convert back to real newlines.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment."
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

// Lazily constructed — see lib/razorpay.ts for why: Next.js imports this
// module during `next build`'s page-data collection step, before any
// request happens and before env vars are necessarily injected (e.g. some
// CI/CD pipelines build before secrets are available). Throwing at import
// time would break `next build` itself; throwing only when a request
// actually needs Firestore is the correct place for this to fail.
let _adminDb: Firestore | null = null

export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb
  _adminDb = getFirestore(getAdminApp())
  return _adminDb
}
