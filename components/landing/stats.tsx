import { Users, Building2, ShieldCheck, Store } from "lucide-react"

const stats = [
  { icon: ShieldCheck, value: "100%", label: "Donation transparency" },
  { icon: Building2, value: "Verified", label: "Organizations only" },
  { icon: Users, value: "Growing", label: "Donor community" },
  { icon: Store, value: "Local", label: "Vendor network" },
]

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-primary p-6 sm:p-8 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground">
                <Icon className="h-6 w-6" />
              </span>
              <p className="mt-3 text-2xl font-extrabold text-primary-foreground sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/70">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
