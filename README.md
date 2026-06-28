# Fix: Admin approve/reject/delete failing with "Missing or insufficient permissions"

## What was wrong
`isAdmin()` in `firestore.rules` used a `get()` lookup on `/users/{uid}.role`
to check for "admin". Testing confirmed this `get()` check was failing in
production even though the Firestore document genuinely had
`role: "admin"` set correctly — isolating `allow update: if isAdmin();`
alone (no `isOwner()`) still failed, while `allow update: if isSignedIn();`
worked. The data, the UID, and the rules text were all correct; the
get()-based lookup itself just wasn't resolving as expected.

## The fix
Switch the admin check from a Firestore document lookup to a **Firebase
Auth custom claim** (`role: "admin"` baked into the ID token). This is
Firebase's documented, recommended pattern for role-based rules and avoids
the cross-document `get()` call entirely.

The old `get()` check is kept as a fallback in the new rules (`||`), so
nothing breaks for any admin account that hasn't had the claim set yet.

## Files in this zip
- `firestore.rules` — replace your existing file with this one
- `lib/firebase-admin.ts` — replace your existing file (now exports `getAdminApp`)
- `app/api/admin/set-admin-claim/route.ts` — new one-time setup route
- `lib/auth.ts` — replace your existing file (adds `refreshAdminToken()`)

## Setup steps (do these in order)

### 1. Add a setup secret to your env
Add this to `.env.local` (for local testing) **and** your Vercel project's
Environment Variables (for production):

```
ADMIN_SETUP_SECRET=pick-any-long-random-string-here
```

Use something long and random — e.g. generate one at
https://1password.com/password-generator/ or run
`openssl rand -hex 32` in a terminal. Redeploy/restart after adding it.

### 2. Replace the 3 files
Copy `firestore.rules`, `lib/firebase-admin.ts`, and `lib/auth.ts` from this
zip into your project, overwriting the existing ones. Add the new
`app/api/admin/set-admin-claim/route.ts` file (new file, new folder).

### 3. Deploy the new Firestore rules
```
firebase deploy --only firestore:rules
```
(Or paste `firestore.rules`'s contents into the Console Rules tab and
click Publish — either works.)

### 4. Deploy the app (Vercel) so the new API route + env var are live
Push to GitHub / let Vercel redeploy, or redeploy manually from the Vercel
dashboard. Confirm `ADMIN_SETUP_SECRET` is set in Vercel's env vars first.

### 5. Call the one-time setup route
Once deployed, call this once (replace values):

```bash
curl -X POST https://sevasetuproject.vercel.app/api/admin/set-admin-claim \
  -H "Content-Type: application/json" \
  -d '{"uid":"xMNCpslkuaQv3a1o1V1oRbUGsyB3","secret":"the-secret-you-set-in-step-1"}'
```

You can also just open Postman/Insomnia, or paste a `fetch(...)` call into
your browser's console while on any page of your own site — just make sure
the secret matches exactly what you put in the env var.

A successful response looks like:
```json
{
  "success": true,
  "message": "Custom claim { role: \"admin\" } set for naidupolimera.6@gmail.com. Sign out and back in on the client to pick it up.",
  "uid": "xMNCpslkuaQv3a1o1V1oRbUGsyB3",
  "email": "naidupolimera.6@gmail.com"
}
```

### 6. Pick up the new claim on the client
Custom claims only show up in a fresh ID token. Easiest: **just sign out
and sign back in** on the admin dashboard. (Alternative if you don't want
to log out: open the browser console on the admin dashboard and run
`await window.__refreshAdminToken?.()` — only works if you wire that up;
signing out/in is simpler and guaranteed to work.)

### 7. Test
Go to the admin dashboard, try Approve / Reject / Delete again. Should all
work now.

## If you add more admin accounts later
Run step 5 again with the new admin's `uid`. The fallback `get()` check in
the rules means they'll work immediately even before you do this — the
claim is just a robustness improvement, not a hard requirement for any
*single* admin to function.

## Optional cleanup (not required)
Once this is confirmed working, you can leave the `set-admin-claim` route
in place (it's safe — it's secret-gated) or delete the folder
`app/api/admin/set-admin-claim/` if you'd rather not keep a setup-only
route around long-term.
