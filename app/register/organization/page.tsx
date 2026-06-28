import { redirect } from "next/navigation"

// Organization registration is invite-only.
// The real registration page is /org/register?invite=TOKEN
// Anyone landing here directly gets redirected to the invalid-invite screen.
export default function OrgRegisterPage() {
  redirect("/org/register")
}