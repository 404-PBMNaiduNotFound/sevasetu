import { HandHeart, Building2, Store, ArrowRight } from "lucide-react"
import Link from "next/link"

const roles = [
  {
    icon: HandHeart,
    title: "I want to donate and make an impact",
    description:
      "Browse verified causes. Sponsor a meal for a specific date, fulfill an item requirement like food or clothing, or send your own items directly. Pay securely via Razorpay and track your donation end to end with photo proof at every step.",
    cta: "Continue as Donor",
    href: "/login",
  },
  {
    icon: Store,
    title: "I am a vendor who prepares and supplies items",
    description:
      "Register your business, list the items you sell (rice, vegetables, utensils, etc.) with per-unit pricing, and receive orders from donors. Mark orders ready for pickup with a photo — organizations collect directly from you.",
    cta: "Continue as Vendor",
    href: "/vendor/register",
  },
  {
    icon: Building2,
    title: "I represent an organization seeking support",
    description:
      "Register your NGO, post meal sponsorship slots and item requirements, approve incoming donations, coordinate vendor pickups, and confirm final delivery with a proof photo — all from one dashboard.",
    cta: "Continue as Organization",
    href: "/org/register",
  },
]

export function RoleCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center mb-10">
        <h2 className="text-pretty text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Who are you on SevaSetu?
        </h2>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
          SevaSetu works because three types of people come together. Find your role below and get started — each has its own dedicated dashboard, tools, and journey.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role) => {
          const Icon = role.icon
          return (
            <Link
              key={role.title}
              href={role.href}
              className="group flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md sm:p-8"
            >
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-7 w-7" />
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-bold leading-snug text-foreground">{role.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {role.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
