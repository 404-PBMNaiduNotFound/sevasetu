import type { ReactNode } from "react"
import Link from "next/link"
import { Heart, ShieldCheck, Globe, HandHeart, ArrowLeft } from "lucide-react"
import { getOrganizations } from "@/lib/firestore"

// ── Pure UI shell (no async — works in both Server and Client trees) ─────────
export function AuthShell({
  children,
  heading,
  subheading,
  orgCount = 0,
  hideSidebar = false,
}: {
  children: ReactNode
  heading: string
  subheading: string
  orgCount?: number
  hideSidebar?: boolean
}) {
  const highlights = [
    { icon: ShieldCheck, label: "Verified organizations", desc: `${orgCount} NGO${orgCount !== 1 ? "s" : ""} vetted and audited.` },
    { icon: Globe,       label: "Global community",       desc: "Support causes around the world." },
    { icon: HandHeart,   label: "100% transparent",       desc: "Track exactly where your money goes." },
  ]

  return (
    <main className="flex h-screen max-h-screen overflow-hidden bg-background">
      {/* Brand panel */}
      {!hideSidebar && (
        <aside className="relative hidden w-[44%] flex-col justify-between overflow-y-auto bg-primary px-12 py-12 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Heart className="h-5 w-5" fill="currentColor" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight">SevaSetu</span>
            <span className="text-[11px] font-medium leading-tight text-primary-foreground/70">
              Smart Donation &amp; Requirement Coordination Platform
            </span>
          </span>
        </Link>

        <div className="max-w-md">
          <h2 className="text-balance text-3xl font-bold leading-tight">
            Generosity that creates lasting change.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-primary-foreground/80">
            Join a community of donors funding {orgCount > 0 ? `${orgCount} verified` : "verified"} projects in education, clean water, and healthcare.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {highlights.map((h) => (
              <li key={h.label} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
                  <h.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{h.label}</p>
                  <p className="text-sm text-primary-foreground/70">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} SevaSetu — All rights reserved.
        </p>

        {/* Decorative accents */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-foreground/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-primary-foreground/5" />
      </aside>
      )}

      {/* Form panel */}
      <section className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-12">
        <Link
          href="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary lg:left-10 lg:top-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Heart className="h-5 w-5" fill="currentColor" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-foreground">SevaSetu</span>
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                Smart Donation &amp; Requirement Coordination Platform
              </span>
            </span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">{heading}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subheading}</p>

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  )
}

// ── Async wrapper — use this in Server Component pages (login, donor register)
// It fetches orgCount and passes it down so AuthShell stays non-async.
export async function AuthShellServer({
  children,
  heading,
  subheading,
}: {
  children: ReactNode
  heading: string
  subheading: string
}) {
  const orgs = await getOrganizations().catch(() => [])
  return (
    <AuthShell heading={heading} subheading={subheading} orgCount={orgs.length}>
      {children}
    </AuthShell>
  )
}