import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface VerificationBannerProps {
  status: 'pending' | 'approved' | 'rejected'
}

export function VerificationBanner({ status }: VerificationBannerProps) {
  if (status === 'approved') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Account Verified</h3>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            Your vendor account has been approved. You can now accept orders and manage your profile.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive">Account Rejected</h3>
          <p className="mt-1 text-sm text-destructive/80">
            Your vendor account has been rejected. Please contact support for more information.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">Pending Verification</h3>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          Your account is under review. This typically takes 2–3 business days.
        </p>
      </div>
    </div>
  )
}
