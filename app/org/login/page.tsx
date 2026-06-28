import type { Metadata } from "next"
import { AuthShellServer } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Organization Sign In — SevaSetu",
  description: "Sign in to your organization account to manage donations and track your impact.",
}

export default function OrgLoginPage() {
  return (
    <AuthShellServer
      heading="Welcome back, Partner"
      subheading="Sign in to manage your programs, update slots, and connect with sponsors."
    >
      <LoginForm />
    </AuthShellServer>
  )
}
