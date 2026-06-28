"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ShieldAlert, Loader2, CheckCircle2, Mail, Home, Phone, Info, X } from "lucide-react"
import { validateInviteToken, consumeInviteToken, getOrganizations, type InviteDoc } from "@/lib/firestore"
import { registerUser } from "@/lib/auth"
import { AuthShell } from "@/components/auth/auth-shell"
import { useAuth } from "@/lib/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

async function fetchContactInfo(): Promise<{ email: string; phone: string }> {
  try {
    const snap = await getDoc(doc(db, "settings", "contact"))
    if (snap.exists()) return { email: snap.data().email ?? "", phone: snap.data().phone ?? "" }
  } catch {}
  return { email: "", phone: "" }
}

async function fetchOrgCount(): Promise<number> {
  try {
    const orgs = await getOrganizations()
    return orgs.length
  } catch {}
  return 0
}

function ContactBlock({ email, phone }: { email: string; phone: string }) {
  if (!email && !phone) return null
  return (
    <div className="flex flex-col items-center gap-2 mt-1">
      {email && (
        <a
          href={"mailto:" + email}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Mail className="h-4 w-4" />
          {email}
        </a>
      )}
      {phone && (
        <a
          href={"https://wa.me/" + phone.replace(/\D/g, "")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors"
        >
          <Phone className="h-4 w-4" />
          {phone}
        </a>
      )}
    </div>
  )
}

function ContactInfoPopup({
  email,
  phone,
  onClose,
}: {
  email: string
  phone: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-8 flex flex-col items-center text-center gap-4">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Info className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Organization Registration</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          For creating the organization, contact the admin with the email or number provided here.
        </p>
        <ContactBlock email={email} phone={phone} />
      </div>
    </div>
  )
}

function AlreadyLoggedInScreen({ email, phone }: { email: string; phone: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-8 flex flex-col items-center text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Mail className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Organization Registration</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          To register your organization, please contact the admin:
        </p>
        <ContactBlock email={email} phone={phone} />
        <p className="text-xs text-gray-400">
          The admin will verify your documents and send you a registration link.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full justify-center"
        >
          <Home className="h-4 w-4" />
          Go to Home
        </Link>
      </div>
    </div>
  )
}

function InvalidInviteScreen({ email, phone }: { email: string; phone: string }) {
  const [showContactPopup, setShowContactPopup] = useState(false)

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Invalid or expired invite</h1>
        <p className="max-w-sm text-sm text-gray-500">
          Organization creation is not possible by your own , only after approvel of the admin you can register your Organization.<br></br>
          if you already contacted admin then,
          This registration link is invalid, has already been used, or was revoked by the admin.
        </p>
        <p className="text-sm text-gray-500">To get a new invite, contact the admin:</p>
        <ContactBlock email={email} phone={phone} />
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go to Home
        </Link>
      </div>

      {showContactPopup && (
        <ContactInfoPopup
          email={email}
          phone={phone}
          onClose={() => setShowContactPopup(false)}
        />
      )}
    </>
  )
}

function OrgRegisterForm({ invite }: { invite: InviteDoc }) {
  const router = useRouter()
  const [name, setName]         = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  const handleSubmit = async () => {
    setError(null)
    if (!name.trim())        return setError("Organization name is required.")
    if (password.length < 6) return setError("Password must be at least 6 characters.")
    if (password !== confirm) return setError("Passwords do not match.")
    setLoading(true)
    try {
      const stillValid = await validateInviteToken(invite.token)
      if (!stillValid) {
        setError("This invite link has already been used or was revoked.")
        setLoading(false)
        return
      }
      const firebaseUser = await registerUser(invite.email, password, "organization", name.trim())
      await consumeInviteToken(invite.token, firebaseUser.uid)
      setDone(true)
      setTimeout(() => router.replace("/org/dashboard"), 2000)
    } catch (e: any) {
      const msg: Record<string, string> = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password is too weak.",
      }
      setError(msg[e?.code] ?? (e instanceof Error ? e.message : "Registration failed."))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-lg font-bold text-gray-900">Registration successful!</p>
        <p className="text-sm text-gray-500">Redirecting to your dashboard</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input value={invite.email} disabled
          className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed"} />
        <p className="mt-1 text-xs text-gray-400">This email was set by the admin.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Organization Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Helping Hands Foundation"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          className={inputClass}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Creating account..." : "Create Organization Account"}
      </button>
    </div>
  )
}

function OrgRegisterInner() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const token = searchParams.get("invite") ?? ""

  const [validating, setValidating] = useState(true)
  const [invite, setInvite]         = useState<InviteDoc | null>(null)
  const [invalid, setInvalid]       = useState(false)
  const [contact, setContact]       = useState({ email: "", phone: "" })
  const [orgCount, setOrgCount]     = useState(0)
  const [showContactPopup, setShowContactPopup] = useState(true)

  useEffect(() => {
    fetchContactInfo().then(setContact)
    fetchOrgCount().then(setOrgCount)
  }, [])

  useEffect(() => {
    if (!token) { setInvalid(true); setValidating(false); return }
    validateInviteToken(token)
      .then((doc) => { if (doc) setInvite(doc); else setInvalid(true) })
      .catch(() => setInvalid(true))
      .finally(() => setValidating(false))
  }, [token])

  if (authLoading || validating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    )
  }

  if (invite) {
    return (
      <>
        <AuthShell
          heading="Organization Registration"
          subheading={"You've been invited to register your organization. Your email (" + invite.email + ") has been pre-verified by the admin."}
          orgCount={orgCount}
          hideSidebar={true}
        >
          <OrgRegisterForm invite={invite} />
        </AuthShell>

        {showContactPopup && (
          <ContactInfoPopup
            email={contact.email}
            phone={contact.phone}
            onClose={() => setShowContactPopup(false)}
          />
        )}
      </>
    )
  }

  if (invalid) return <InvalidInviteScreen email={contact.email} phone={contact.phone} />

  if (user) return <AlreadyLoggedInScreen email={contact.email} phone={contact.phone} />

  return <InvalidInviteScreen email={contact.email} phone={contact.phone} />
}

export default function OrgRegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    }>
      <OrgRegisterInner />
    </Suspense>
  )
}
