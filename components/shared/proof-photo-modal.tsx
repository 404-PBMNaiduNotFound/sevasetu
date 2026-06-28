"use client"

import { useRef, useState } from "react"
import { Camera, ImagePlus, FolderOpen, Loader2, X, AlertCircle } from "lucide-react"
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
  title: string
  description: string
  confirmLabel: string
  onConfirm: (file: File) => Promise<void>
}

export function ProofPhotoModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ProofPhotoModalProps) {
  const [file, setFile]           = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Two separate hidden inputs — one forces camera, one opens gallery
  const cameraInputRef  = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
    setError(null)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const applyFile = (selected: File) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) applyFile(selected)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  const clearPhoto = () => {
    setFile(null)
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
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

  // Styles as CSSProperties to avoid TS errors
  const uploadRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  }

  const uploadBtnStyle: React.CSSProperties = {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    padding:        "20px 12px",
    borderRadius:   14,
    border:         "2px dashed #e2e8f0",
    background:     "#f8fafc",
    cursor:         "pointer",
    width:          "100%",
    transition:     "border-color 0.15s, background 0.15s",
    color:          "#64748b",
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Hidden inputs — camera vs gallery */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {previewUrl ? (
            /* ── Preview ── */
            <div style={{ position: "relative" }}>
              <img
                src={previewUrl}
                alt="Proof preview"
                className="w-full max-h-72 rounded-xl border border-border object-contain bg-muted"
              />
              <button
                type="button"
                onClick={clearPhoto}
                style={{
                  position:     "absolute",
                  top:          8,
                  right:        8,
                  borderRadius: "50%",
                  background:   "rgba(0,0,0,0.6)",
                  padding:      6,
                  color:        "#fff",
                  border:       "none",
                  cursor:       "pointer",
                  display:      "flex",
                }}
                aria-label="Remove photo"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ) : (
            /* ── Upload options ── */
            <div style={uploadRowStyle}>
              {/* Camera */}
              <button
                type="button"
                style={uploadBtnStyle}
                onClick={() => cameraInputRef.current?.click()}
              >
                <span style={{
                  background:   "#eff6ff",
                  borderRadius: "50%",
                  padding:      10,
                  display:      "flex",
                }}>
                  <Camera style={{ width: 22, height: 22, color: "#1D4ED8" }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Camera</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Take a photo</span>
              </button>

              {/* Gallery / Storage */}
              <button
                type="button"
                style={uploadBtnStyle}
                onClick={() => galleryInputRef.current?.click()}
              >
                <span style={{
                  background:   "#f0fdf4",
                  borderRadius: "50%",
                  padding:      10,
                  display:      "flex",
                }}>
                  <FolderOpen style={{ width: 22, height: 22, color: "#16A34A" }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Gallery</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Choose from files</span>
              </button>
            </div>
          )}

          {/* Retake row shown after photo is selected */}
          {previewUrl && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
                Retake
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => galleryInputRef.current?.click()}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Choose Different
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Uploading…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}