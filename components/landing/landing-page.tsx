import { Navbar } from "./navbar"
import { Hero } from "./hero"
import { Stats } from "./stats"
import { FeaturedOrganizations } from "./featured-organizations"
import { HowItWorks } from "./how-it-works"
import { HowTheFlowWorks } from "./how-the-flow-works"
import { RoleCards } from "./role-cards"
import { PaymentAndLocation } from "./payment-and-location"
import { ReviewCarousel } from "./review-carousel"
import { Footer } from "./footer"

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-col gap-20 pb-20 pt-8">
        <Hero />
        <Stats />
        <FeaturedOrganizations />
        <HowItWorks />
        <HowTheFlowWorks />
        <RoleCards />
        <PaymentAndLocation />
        <ReviewCarousel />
      </main>
      <Footer />
    </div>
  )
}
