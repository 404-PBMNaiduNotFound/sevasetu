"use client"

import { useState } from "react"
import { Camera, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface ProofImageBadgeProps {
  url?: string | null
  label: string
}

/**
 * Small clickable badge shown wherever a proof photo exists on a card/row.
 * Clicking it opens a popup with the full-size image. Renders nothing if
 * there's no proof photo yet for this field.
 */
export function ProofImageBadge({ url, label }: ProofImageBadgeProps) {
  const [open, setOpen] = useState(false)

  if (!url) return null

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Camera className="h-3.5 w-3.5" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <img
            src={url}
            alt={label}
            className="w-full max-h-[75vh] rounded-xl object-contain bg-muted"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
