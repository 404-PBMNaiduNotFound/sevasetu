import { Heart, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center sm:px-12 sm:py-16">
        <h2 className="mx-auto max-w-2xl text-pretty text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
          Your generosity can change a life today
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-primary-foreground/80">
          Join hundreds of thousands of donors creating real, measurable change. Start with any
          amount it all adds up.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="gap-2 rounded-xl bg-card px-7 text-base font-medium text-primary hover:bg-card/90"
          >
            <Heart className="h-5 w-5" fill="currentColor" />
            Donate Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 rounded-xl border-2 border-primary-foreground/40 bg-transparent px-7 text-base font-medium text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Compass className="h-5 w-5" />
            Explore Organizations
          </Button>
        </div>
      </div>
    </section>
  )
}
