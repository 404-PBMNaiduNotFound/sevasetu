import { RegisterForm } from "@/components/auth/register-form";

export default function DonorRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="mb-4 text-2xl font-bold">Donor Registration</h1>
      <RegisterForm presetRole="donor" />
    </div>
  );
}
