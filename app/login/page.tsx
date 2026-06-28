import type { Metadata } from "next"
import { AuthShellServer } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign In — SevaSetu",
  description: "Sign in to your SevaSetu account.",
}

export default function LoginPage() {
  return (
    <AuthShellServer
      heading="Welcome back"
      subheading="Sign in to your account to continue making a difference."
    >
      <LoginForm />
    </AuthShellServer>
  )
}
