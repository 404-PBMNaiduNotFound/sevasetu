"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X, UserCircle2, MapPin, Phone, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateUser } from "@/lib/firestore"

interface CompleteProfilePopupProps {
  uid: string
}

export function CompleteProfilePopup({ uid }: CompleteProfilePopupProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  const dismiss = async () => {
    setVisible(false)
    try {
      await updateUser(uid, { profilePromptSeen: true } as any)
    } catch (e) {
      console.error("Failed to mark profilePromptSeen:", e)
    }
  }

  const goToProfile = async () => {
    await dismiss()
    router.push("/donor/profile")
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
          <UserCircle2 className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-bold text-foreground">Complete your profile</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Help organizations reach you and find the right donation opportunities near you.
        </p>

        {/* What to fill */}
        <ul className="mt-4 flex flex-col gap-2">
          {[
            { icon: UserCircle2, text: "Full name" },
            { icon: Phone,       text: "Mobile number" },
            { icon: MapPin,      text: "City & State (for local recommendations)" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-4 py-2.5 text-sm text-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={dismiss}
          >
            I'll do it later
          </Button>
          <Button
            className="gap-2 rounded-xl"
            onClick={goToProfile}
          >
            Go to Settings
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}