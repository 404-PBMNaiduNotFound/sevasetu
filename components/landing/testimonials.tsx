import { Quote } from "lucide-react"

// Testimonials are removed until real user testimonials exist.
// This component renders the section header and an invitation to share,
// preserving the section structure without fabricated content.
export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-pretty text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Trusted by donors and organizations
        </h2>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
          Join our growing community and start making a real difference today.
        </p>
      </div>

      <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Quote className="h-10 w-10 text-accent" fill="currentColor" />
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Stories from our community will appear here. Be one of the first to make an impact and
          share your experience.
        </p>
      </div>
    </section>
  )
}
