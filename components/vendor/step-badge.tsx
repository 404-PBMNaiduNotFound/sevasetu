import { Check } from 'lucide-react'

interface StepBadgeProps {
  number: number
  isActive: boolean
  isCompleted: boolean
  label: string
}

export function StepBadge({ number, isActive, isCompleted, label }: StepBadgeProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-colors ${
          isCompleted
            ? 'bg-emerald-600 text-white'
            : isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isCompleted ? <Check className="h-5 w-5" /> : number}
      </div>
      <span className="max-w-20 text-center text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
