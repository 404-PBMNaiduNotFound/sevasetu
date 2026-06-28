/**
 * set-admin-claim.js
 * Place this file in your project root (C:\Users\bhanu_zjyrb2j\Desktop\SS\)
 * and run:  node set-admin-claim.js
 */

const admin = require("firebase-admin")
const serviceAccount = require("./serviceAccountKey.json")

// ✏️ Replace with your admin UID from Firebase Console → Authentication → Users
const ADMIN_UID = "xMNCpslkuaQv3a1o1V1oRbUGsyB3"

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

admin.auth()
  .setCustomUserClaims(ADMIN_UID, { role: "admin" })
  .then(() => {
    console.log("✅ Done! Custom claim { role: 'admin' } set on UID:", ADMIN_UID)
    console.log("   Sign out and sign back in on the admin account in your browser.")
    process.exit(0)
  })
  .catch((err) => {
    console.error("❌ Failed:", err)
    process.exit(1)
  })