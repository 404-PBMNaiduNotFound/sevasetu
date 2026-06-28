import { Search, Link2, LineChart } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "Discover a cause",
    description:
      "Browse verified organizations by category, location, or urgency and find a mission that speaks to you.",
  },
  {
    icon: Link2,
    title: "Stay connected",
    description:
      "Every act of generosity is the beginning of a relationship. Stay linked to the people and causes you care about through real updates on your impact.",
  },
  {
    icon: LineChart,
    title: "Track your impact",
    description:
      "Receive transparent updates and reports showing exactly how your contribution made a difference.",
  },
]

export function HowItWorks() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-pretty text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          How SevaSetu works
        </h2>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
          Giving should be simple, safe, and transparent. Here&apos;s how you can start making an
          impact in three easy steps.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <span className="absolute right-6 top-6 text-5xl font-extrabold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
