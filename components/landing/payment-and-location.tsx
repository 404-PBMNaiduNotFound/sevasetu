import { CreditCard, MapPin, ShieldCheck, Truck, CheckCircle2, Navigation } from "lucide-react"

const paymentSteps = [
  {
    icon: CreditCard,
    title: "Donor pays online",
    detail: "After choosing a vendor item, the donor sees an order summary with item, quantity, and total. They pay via UPI, card, or net banking through Razorpay — India's most trusted payment gateway.",
  },
  {
    icon: ShieldCheck,
    title: "Payment verified server-side",
    detail: "After payment, Razorpay's signature is verified on our server before the order status is updated. No client-side trust — the order only moves forward after server confirmation.",
  },
  {
    icon: Truck,
    title: "Vendor prepares the order",
    detail: "The vendor's dashboard shows the new order immediately. Status moves: Payment Confirmed → Preparing → Ready for Pickup. Each transition requires a photo proof.",
  },
  {
    icon: CheckCircle2,
    title: "Org collects & confirms",
    detail: "The org picks up from the vendor and marks it 'Picked Up' with a photo. The linked donation is automatically marked Completed — both donor and org can see all proof photos.",
  },
]

const locationFeatures = [
  {
    icon: Navigation,
    title: "Pin your exact location",
    detail: "Donors, organizations, and vendors can all pin their precise location on an interactive map in their profile settings. No manual address typing needed — GPS does it for you.",
  },
  {
    icon: MapPin,
    title: "Browse organizations near you",
    detail: "Donors can browse verified organizations filtered by city or state. Each org card shows the distance from your pinned location so you can find causes closest to home.",
  },
  {
    icon: MapPin,
    title: "Find vendors by proximity",
    detail: "When an org searches for vendors who supply a specific item, vendors are ranked by proximity to the org. This keeps logistics short and ensures fresh supplies.",
  },
  {
    icon: ShieldCheck,
    title: "Location is optional but powerful",
    detail: "You don't need to share your location to use SevaSetu — but pinning it unlocks distance-based browsing and smarter vendor matching for both donors and organizations.",
  },
]

export function PaymentAndLocation() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">

        {/* Payment */}
        <div>
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
              <CreditCard className="h-3.5 w-3.5" />
              Secure Payments
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              How payments work
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Money never passes through SevaSetu — donors pay vendors directly via Razorpay, and every transaction is verified server-side before the order progresses. Here's the full payment lifecycle:
            </p>
          </div>

          <ol className="space-y-5">
            {paymentSteps.map((step, i) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {i < paymentSteps.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="font-semibold text-foreground">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Location */}
        <div>
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              Location-Based Search
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Find help near you
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SevaSetu uses real-time GPS and map-based location picking to connect donors, vendors, and organizations based on physical proximity — so giving is local, fast, and meaningful.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {locationFeatures.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-semibold text-foreground">{feat.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feat.detail}</p>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
