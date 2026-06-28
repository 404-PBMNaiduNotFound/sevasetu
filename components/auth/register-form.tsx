"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { registerUser, getUserRole, getRedirectPath } from "@/lib/auth"
import { auth, db } from "@/lib/firebase"
import { sanitizeData } from "@/lib/sanitize"

function setRoleCookie(role: string) {
  document.cookie = `user_role=${role};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Strict`
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

// ── Donor-only registration form ─────────────────────────────────────────────
// Organization registration is invite-only via /org/register?invite=TOKEN
// Do NOT add an org role option here — it would bypass the invite system.

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const isBusy = loading || googleLoading

  async function handleGoogleSignUp() {
    setError("")
    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      const { uid, email: userEmail, displayName } = cred.user

      // Create user doc if first time (idempotent — safe to call on re-login too)
      const userRef = doc(db, "users", uid)
      const snap = await getDoc(userRef)
      if (!snap.exists()) {
        await setDoc(
          userRef,
          sanitizeData({
            uid,
            email: userEmail ?? "",
            name: displayName ?? "",
            role: "donor",
            createdAt: serverTimestamp(),
          })
        )
      }

      const role = await getUserRole(uid)
      if (!role) {
        setError("User profile not found. Please try again.")
        return
      }

      setRoleCookie(role)
      router.push(getRedirectPath(role))
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === "auth/popup-closed-by-user") return   // user dismissed — no error
      if (code === "auth/popup-blocked-by-browser") {
        setError("Popup was blocked by your browser. Please allow popups for this site and try again.")
        return
      }
      setError(err instanceof Error ? err.message : "Failed to sign up with Google. Please try again.")
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await registerUser(email, password, "donor", name)
      router.push("/donor/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        onClick={handleGoogleSignUp}
        className="h-11 w-full gap-2.5 rounded-xl border-2 text-sm font-semibold text-foreground hover:bg-accent"
      >
        {googleLoading ? (
          <Spinner className="size-4" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? "Signing up…" : "Sign up with Google"}
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or sign up with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground">
          Full name
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Amelia Parker"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl pl-10"
            required
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-email" className="text-sm font-medium text-foreground">
          Email address
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl pl-10"
            required
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl px-10"
            required
            disabled={isBusy}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="terms" className="mt-0.5" required />
        <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground">
          I agree to the{" "}
          <Link href="#" className="font-medium text-primary hover:underline">Terms of Service</Link>{" "}
          and{" "}
          <Link href="#" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isBusy}
        className="h-11 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {loading ? <Spinner className="size-5 text-primary-foreground" /> : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </form>
  )
}

// Alias kept so existing imports don't break
export { RegisterForm as DonorRegisterForm }

// REMOVED: OrgRegisterForm — org registration is invite-only.
// Use app/org/register/page.tsx which validates the ?invite= token.
// If anything imports OrgRegisterForm, delete that import — it no longer exists.