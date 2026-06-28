import { LucideIcon } from 'lucide-react'

interface DashboardStatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function DashboardStatsCard({
  label,
  value,
  icon: Icon,
  trend,
}: DashboardStatsCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p
              className={`mt-2 text-xs font-medium ${
                trend.isPositive ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  )
}
