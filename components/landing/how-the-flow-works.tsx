import {
  HandHeart,
  Store,
  Building2,
  Camera,
  CheckCircle2,
  ArrowDown,
} from "lucide-react"

const flows = [
  {
    role: "Donor",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100 text-blue-600",
    Icon: HandHeart,
    steps: [
      {
        title: "Register & browse",
        detail:
          "Sign up as a donor, set your location, and browse verified organizations near you. Each org shows what it needs — meal slots for specific dates, or item requirements like rice, vegetables, or clothing.",
      },
      {
        title: "Choose how to give",
        detail:
          "Pick a sponsorship slot (e.g. 'Lunch on 15 July for 50 people') or fulfill a posted item requirement. You can also donate your own items directly without a payment — just fill a request form.",
      },
      {
        title: "Pay securely via Razorpay",
        detail:
          "For vendor-fulfilled orders, you're taken to a checkout page showing item, quantity, and total. Pay online via UPI, card, or net banking through Razorpay's secure gateway. Your payment goes into an order that the vendor can see immediately.",
      },
      {
        title: "Attach a proof photo",
        detail:
          "For self-shipped items, once you've packed and dispatched the goods, tap 'Donate' and attach a photo of your packed items. This is your confirmation — the org sees it and knows the items are on the way.",
      },
      {
        title: "Track your donation",
        detail:
          "From your Donations page, follow your contribution through every status: Pending → Approved → ToBeConfirmed → Completed. Each step has a timestamp and proof photo so you always know what's happening.",
      },
    ],
  },
  {
    role: "Vendor",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    iconBg: "bg-orange-100 text-orange-600",
    Icon: Store,
    steps: [
      {
        title: "Register & get approved",
        detail:
          "Submit your business details and verification documents (business license, tax ID, bank info). An admin reviews and approves your account before you appear in donor searches.",
      },
      {
        title: "List your items & prices",
        detail:
          "From your Items page, add everything you sell — rice, lentils, vegetables, cooking oil, utensils — with per-unit pricing and stock availability. Donors browsing requirements will see your catalog.",
      },
      {
        title: "Receive orders",
        detail:
          "When a donor pays for an item you supply, you receive an order on your dashboard showing the item, quantity, amount, and the organization's pickup address. Orders flow in automatically after payment is verified.",
      },
      {
        title: "Prepare & attach proof photo",
        detail:
          "Pack the order, then click 'Mark Ready for Pickup' and attach a photo of the prepared goods. This photo is mandatory — it proves the order is ready and notifies the org that they can come collect.",
      },
      {
        title: "Organization collects",
        detail:
          "The org sees your ready-for-pickup photo and comes to collect. Once they mark it 'Picked Up' with their own photo, your order is complete. Track all your orders, revenue, and history from your dashboard.",
      },
    ],
  },
  {
    role: "Organization",
    color: "bg-green-50 border-green-200 text-green-700",
    iconBg: "bg-green-100 text-green-600",
    Icon: Building2,
    steps: [
      {
        title: "Register with an invite & get verified",
        detail:
          "Organizations join by invitation — an admin sends a unique token to your registered email. Complete your profile (name, address, category, description) and get approved before going public.",
      },
      {
        title: "Post slots & requirements",
        detail:
          "Create meal sponsorship slots for specific dates (e.g. 'Dinner for 100 on Independence Day') or post item requirements (e.g. '50 kg Rice needed by next week'). Both appear on donor browse pages immediately.",
      },
      {
        title: "Approve incoming donations",
        detail:
          "Donors submit requests against your slots and requirements. Review each one — approve it (which locks in the quantity and notifies the donor), cap the amount if partially filled, or reject with a reason.",
      },
      {
        title: "Coordinate vendor pickups",
        detail:
          "When a donor pays a vendor for an item linked to your requirement, you see the order on your Ready-to-Ship page. Once the vendor marks it ready, you go collect it — then mark it 'Picked Up' with a photo.",
      },
      {
        title: "Confirm delivery with proof",
        detail:
          "For self-shipped donor items, click 'Complete' and attach a photo showing the received goods. This closes the donation loop — the donor can see their proof photo alongside yours, confirming real-world impact.",
      },
    ],
  },
]

export function HowTheFlowWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-pretty text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          How SevaSetu works — step by step
        </h2>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
          SevaSetu connects three roles in one transparent chain. Here's exactly what each person does, in the order they do it — so you understand the whole picture before you sign up.
        </p>
      </div>

      {/* Photo proof callout */}
      <div className="mt-10 flex items-start gap-4 rounded-2xl border border-border bg-accent/40 p-5 sm:items-center">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Camera className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">Photo proof at every step</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            SevaSetu requires a real photo at three critical moments: when the <strong>donor dispatches</strong> items, when the <strong>vendor marks an order ready</strong>, and when the <strong>org confirms receipt</strong>. No step can be marked complete without one. This makes fraud impossible and gives every party visible, downloadable proof.
          </p>
        </div>
      </div>

      {/* Role flows */}
      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {flows.map((flow) => {
          const Icon = flow.Icon
          return (
            <div
              key={flow.role}
              className={`rounded-2xl border p-6 ${flow.color}`}
            >
              {/* Role header */}
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${flow.iconBg}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-extrabold">{flow.role}</h3>
              </div>

              {/* Steps */}
              <ol className="mt-6 space-y-5">
                {flow.steps.map((step, i) => (
                  <li key={step.title} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm font-bold">{step.title}</p>
                    </div>
                    <p className="ml-8 text-xs leading-relaxed opacity-80">{step.detail}</p>
                    {i < flow.steps.length - 1 && (
                      <ArrowDown className="ml-1 mt-1 h-3 w-3 opacity-40" />
                    )}
                  </li>
                ))}
              </ol>

              {/* Done badge */}
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs font-semibold">
                  {flow.role === "Donor" && "Your dashboard shows every donation + proof photo."}
                  {flow.role === "Vendor" && "Your dashboard shows all orders, revenue & status history."}
                  {flow.role === "Organization" && "Your dashboard shows all donations, requirements & reports."}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
