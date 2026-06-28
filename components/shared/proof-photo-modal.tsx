"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, X, AlertCircle, ImagePlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ProofPhotoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shown as the dialog title, e.g. "Confirm Donation", "Mark Ready for Pickup" */
  title: string
  /** Short explanation of what the photo is proof of */
  description: string
  /** Label for the confirm button, e.g. "Confirm & Donate" */
  confirmLabel: string
  /** Called with the selected File once the user confirms. Throw to surface
   *  an error in the modal (it stays open and shows the error). */
  onConfirm: (file: File) => Promise<void>
}

/**
 * Shared "attach a proof photo, then confirm" modal used by every action
 * across donor/org/vendor that now requires a photo: donor "Donate", vendor
 * "Mark Ready for Pickup", org "Mark Picked Up" and "Complete". A photo is
 * mandatory — the confirm button is enabled either way (so the click always
 * registers), but submitting without a photo shows an inline error instead
 * of silently failing or proceeding without proof.
 */
export function ProofPhotoModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ProofPhotoModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setError(null)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith("image/")) {
      setError("Please select an image file.")
      return
    }
    setError(null)
    setFile(selected)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selected)
    })
  }

  const handleConfirm = async () => {
    if (!file) {
      setError("A photo is required as proof before you can continue.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(file)
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Proof preview"
                className="w-full max-h-72 rounded-xl border border-border object-contain bg-muted"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev)
                    return null
                  })
                  if (inputRef.current) inputRef.current.value = ""
                }}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Tap to take or upload a photo</span>
              <span className="text-xs">Required as proof</span>
            </button>
          )}

          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              Retake / Choose Different Photo
            </Button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Uploading…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
