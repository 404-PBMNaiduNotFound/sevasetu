"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Mail, Lock, Eye, EyeOff, Building2, HeartHandshake, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { loginUser, getUserRole, getRedirectPath } from "@/lib/auth"
import { auth, db } from "@/lib/firebase"
import { sanitizeData } from "@/lib/sanitize"

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

/** Write the role cookie so middleware can read it for route protection */
function setRoleCookie(role: string) {
  document.cookie = `user_role=${role};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Strict`
}

// Demo accounts — hardcoded fallback; admin can override via dashboard → Settings → Demo Credentials
const FALLBACK_DEMOS = [
  { key: "org",    label: "Organization Demo", email: "vizagWorriers@org.in", password: "vizagWorriers@123", icon: Building2 },
  { key: "donor",  label: "Donor Demo",        email: "Amelia@gmail.com",     password: "Amelia@123",        icon: HeartHandshake },
  { key: "vendor", label: "Vendor Demo",       email: "book@org.in",          password: "book@123",          icon: Store },
] as const

type DemoKey = "org" | "donor" | "vendor"

type DemoAccount = {
  key: DemoKey
  label: string
  email: string
  password: string
  icon: typeof Building2
}

const ICON_MAP: Record<DemoKey, typeof Building2> = {
  org: Building2,
  donor: HeartHandshake,
  vendor: Store,
}

export function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [filledDemo, setFilledDemo] = useState<string | null>(null)
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(
    FALLBACK_DEMOS.map((d) => ({ ...d, icon: ICON_MAP[d.key] }))
  )
  const [showDemo, setShowDemo] = useState(true)

  // Load demo credentials and visibility from Firestore (admin can update via dashboard)
  useEffect(() => {
    getDoc(doc(db, "settings", "demoAccounts"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as { accounts?: Array<{ key: DemoKey; label: string; email: string; password: string }>; showDemo?: boolean }
          if (data.accounts?.length) {
            setDemoAccounts(
              data.accounts.map((a) => ({ ...a, icon: ICON_MAP[a.key] ?? Building2 }))
            )
          }
          if (typeof data.showDemo === "boolean") setShowDemo(data.showDemo)
        }
      })
      .catch(() => {/* silently fall back to hardcoded */})
  }, [])

  const isBusy = loading || googleLoading

  function fillDemoAccount(acc: DemoAccount) {
    setError("")
    setEmail(acc.email)
    setPassword(acc.password)
    setFilledDemo(acc.key)
  }

  async function handleGoogleSignIn() {
    setError("")
    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      const { uid, email: userEmail, displayName } = cred.user

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
        setError("User profile not found.")
        return
      }

      setRoleCookie(role)
      router.push(getRedirectPath(role))
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === "auth/popup-closed-by-user") return
      setError(err instanceof Error ? err.message : "Failed to sign in with Google. Please try again.")
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const cred = await loginUser(email, password)
      const role = await getUserRole(cred.user.uid)
      if (!role) {
        setError("User profile not found.")
        return
      }

      setRoleCookie(role)
      router.push(getRedirectPath(role))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please try again.")
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
        onClick={handleGoogleSignIn}
        className="h-11 w-full gap-2.5 rounded-xl border-2 text-sm font-semibold text-foreground hover:bg-accent"
      >
        {googleLoading ? (
          <Spinner className="size-5" />
        ) : (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or continue with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFilledDemo(null)
            }}
            className="h-11 rounded-xl pl-10"
            required
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <Link href="#" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setFilledDemo(null)
            }}
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
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="remember" defaultChecked />
        <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
          Keep me signed in
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Demo / view-only accounts — placed right above the Sign in button */}
      {showDemo && (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Just exploring? Try a view-only demo account:
        </p>
        <div className="flex gap-2">
          {demoAccounts.map((acc) => {
            const Icon = acc.icon
            const active = filledDemo === acc.key
            return (
              <button
                key={acc.key}
                type="button"
                disabled={isBusy}
                onClick={() => fillDemoAccount(acc)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {acc.label}
              </button>
            )
          })}
        </div>
        {filledDemo && (
          <p className="mt-2 text-xs text-muted-foreground">
            Demo credentials filled in — click <strong>Sign in</strong> below to continue.
          </p>
        )}
      </div>
      )}

      <Button
        type="submit"
        disabled={isBusy}
        className="h-11 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {loading ? <Spinner className="size-5 text-primary-foreground" /> : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to SevaSetu?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}