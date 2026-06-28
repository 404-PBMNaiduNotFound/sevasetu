import Link from "next/link"
import { HandHeart, Building2, Store } from "lucide-react"
import { AuthShellServer } from "@/components/auth/auth-shell"

export default function RegisterPage() {
  return (
    <AuthShellServer
      heading="Create your account"
      subheading="Choose how you'd like to join the platform."
    >
      <div className="flex flex-col gap-4">
        <Link
          href="/register/donor"
          className="flex items-start gap-4 rounded-xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HandHeart className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">I'm a Donor</p>
            <p className="text-sm text-muted-foreground">Support causes you care about</p>
          </div>
        </Link>

        <Link
          href="/register/organization"
          className="flex items-start gap-4 rounded-xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">I'm an Organization</p>
            <p className="text-sm text-muted-foreground">Raise funds for your mission</p>
          </div>
        </Link>

        <Link
          href="/vendor/register"
          className="flex items-start gap-4 rounded-xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">I'm a Vendor</p>
            <p className="text-sm text-muted-foreground">Fulfil donation orders for organizations</p>
          </div>
        </Link>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShellServer>
  )
}