// app/api/admin/set-admin-claim/route.ts
//
// ONE-TIME SETUP ROUTE — sets { role: "admin" } as a Firebase Auth custom
// claim on a user, so Firestore rules can check request.auth.token.role
// instead of doing a get() lookup on /users/{uid}.
//
// Why this exists: the get()-based isAdmin() check in firestore.rules was
// failing in production even though /users/{uid}.role was correctly set to
// "admin" in Firestore. Custom claims avoid the cross-document get() read
// entirely — the role is baked into the user's ID token itself, so the
// rules engine never has to look anything up.
//
// SECURITY: this route is protected by a setup secret (ADMIN_SETUP_SECRET)
// so randos can't grant themselves admin. After you've run this once for
// your account, you can leave the route in place (it's harmless — it still
// requires the secret) or delete it.
//
// Usage (run once, from your own machine or a quick curl/Postman call):
//   POST /api/admin/set-admin-claim
//   Body (JSON): { "uid": "xMNCpslkuaQv3a1o1V1oRbUGsyB3", "secret": "whatever-you-set-in-env" }
//
// Setup:
//   1. Add ADMIN_SETUP_SECRET=<some-long-random-string> to your env
//      (.env.local for local testing, and Vercel project settings for prod)
//   2. Deploy / restart dev server so the env var is loaded
//   3. Call this route once with your admin account's uid
//   4. Sign out and back in on the client (or call getIdToken(true)) so the
//      new claim is picked up — see lib/auth.ts refreshClaims() below

import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getAdminApp } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    const { uid, secret } = await req.json()

    const expected = process.env.ADMIN_SETUP_SECRET
    if (!expected) {
      return NextResponse.json(
        { error: "ADMIN_SETUP_SECRET is not set on the server." },
        { status: 500 }
      )
    }
    if (!secret || secret !== expected) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 403 })
    }
    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ error: "Missing uid." }, { status: 400 })
    }

    const auth = getAuth(getAdminApp())

    // Confirm the user actually exists before setting claims on them
    const user = await auth.getUser(uid)

    await auth.setCustomUserClaims(uid, { role: "admin" })

    return NextResponse.json({
      success: true,
      message: `Custom claim { role: "admin" } set for ${user.email ?? uid}. Sign out and back in on the client to pick it up.`,
      uid,
      email: user.email,
    })
  } catch (err: any) {
    console.error("set-admin-claim error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Failed to set custom claim." },
      { status: 500 }
    )
  }
}
