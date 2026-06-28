import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const serviceAccount = require("./serviceAccountKey.json")

initializeApp({ credential: cert(serviceAccount) })

await getAuth()
  .setCustomUserClaims("xMNCpslkuaQv3a1o1V1oRbUGsyB3", { role: "admin" })
  .then(() => {
    console.log("✅ Done! Sign out and sign back in on the admin account.")
    process.exit(0)
  })
  .catch((e) => {
    console.error("❌ Error:", e.message)
    process.exit(1)
  })
