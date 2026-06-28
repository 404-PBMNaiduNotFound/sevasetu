import { AuthShellServer } from "@/components/auth/auth-shell"
import { DonorRegisterForm } from "@/components/auth/register-form"

export default function DonorRegisterPage() {
  return (
    <AuthShellServer
      heading="Create your donor account"
      subheading="Join thousands of donors making a real difference in the world."
    >
      <DonorRegisterForm />
    </AuthShellServer>
  )
}