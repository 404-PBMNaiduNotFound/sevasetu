import { Badge } from '@/components/ui/badge'

type StatusType =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'payment_confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'failed'
  | 'cancelled_by_donor'

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Pending Approval',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  },
  picked_up: {
    label: 'Picked Up',
    className: 'bg-muted text-muted-foreground border-border',
  },
  failed: {
    label: 'Failed / Cancelled',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  },
  cancelled_by_donor: {
    label: 'Cancelled by Donor',
    className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-600',
  },
}

const fallbackConfig = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground border-border',
}

interface StatusPillProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const config = statusConfig[status as StatusType] ?? fallbackConfig

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
    >
      {config.label}
    </Badge>
  )
}
