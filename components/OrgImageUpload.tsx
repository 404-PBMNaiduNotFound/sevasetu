"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Trash2, Upload, Star } from "lucide-react"
import { fileToCompressedDataURL, approxBase64Bytes, ImageTooLargeError } from "@/lib/imageUtils"
import { upsertOrganization } from "@/lib/firestore"

interface OrgImageUploadProps {
  orgId: string
  /** Existing gallery images. images[0] is treated as the cover image. */
  currentPhotoURLs?: string[]
  onChange?: (urls: string[]) => void
}

// Soft per-image cap so a handful of images don't blow past Firestore's
// 1MB document limit. ~250KB per image keeps a 4-image gallery well under that.
const MAX_IMAGE_BYTES = 250 * 1024

export function OrgImageUpload({
  orgId,
  currentPhotoURLs,
  onChange,
}: OrgImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<string[]>(currentPhotoURLs ?? [])
  const [uploading, setUploading] = useState(false)
  const [busyIndex, setBusyIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openFilePicker(e: React.MouseEvent) {
    e.stopPropagation()
    if (!uploading) inputRef.current?.click()
  }

  async function persist(next: string[]) {
    setImages(next)
    onChange?.(next)
    await upsertOrganization(orgId, { photoURLs: next })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setError(null)
    setUploading(true)

    try {
      const compressed: string[] = []
      for (const file of files) {
        try {
          const dataUrl = await fileToCompressedDataURL(file)
          if (approxBase64Bytes(dataUrl) > MAX_IMAGE_BYTES) {
            // fileToCompressedDataURL already downsamples; if it's still
            // too big the source photo was extreme — skip it gracefully.
            setError("One of the images was too large after compression and was skipped.")
            continue
          }
          compressed.push(dataUrl)
        } catch (err) {
          if (err instanceof ImageTooLargeError) {
            setError(err.message)
          } else {
            console.error("Image compression failed:", err)
            setError("Failed to process one of the selected images.")
          }
        }
      }

      if (compressed.length > 0) {
        const next = [...images, ...compressed]
        await persist(next)
      }
    } catch (err) {
      console.error("Upload failed:", err)
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleDelete(index: number, e: React.MouseEvent) {
    e.stopPropagation()
    setError(null)
    setBusyIndex(index)
    try {
      const next = images.filter((_, i) => i !== index)
      await persist(next)
    } catch (err) {
      console.error("Delete failed:", err)
      setError(err instanceof Error ? err.message : "Delete failed.")
    } finally {
      setBusyIndex(null)
    }
  }

  async function handleMakeCover(index: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (index === 0) return
    setError(null)
    setBusyIndex(index)
    try {
      const next = [...images]
      const [chosen] = next.splice(index, 1)
      next.unshift(chosen)
      await persist(next)
    } catch (err) {
      console.error("Failed to set cover image:", err)
      setError(err instanceof Error ? err.message : "Failed to set cover image.")
    } finally {
      setBusyIndex(null)
    }
  }

  const cover = images[0]

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Cover image box — first image in the array */}
      <div
        onClick={openFilePicker}
        className="relative w-full max-w-sm h-52 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
      >
        {cover ? (
          <>
            <img
              src={cover}
              alt="Organization cover"
              className="h-full w-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-white">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Click to add more images</span>
              </div>
            </div>
            <span className="absolute left-3 top-3 rounded-full bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Cover
            </span>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <ImagePlus className="h-10 w-10" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Click to upload image</p>
              <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP or GIF · Max 5 MB</p>
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm font-semibold">Processing…</span>
          </div>
        )}
      </div>

      {/* Hidden file input — supports multi-select */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {/* Buttons row */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Upload className="h-4 w-4" />
          {images.length > 0 ? "Add Images" : "Upload Image"}
        </button>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
          {error}
        </p>
      )}

      {/* Thumbnail strip — manage gallery images / pick a new cover */}
      {images.length > 1 && (
        <div className="w-full max-w-sm">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Gallery images ({images.length}) · click the star to set as cover
          </p>
          <div className="grid grid-cols-4 gap-2">
            {images.map((src, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group"
              >
                <img src={src} alt={`Gallery ${i + 1}`} className="h-full w-full object-contain" />
                {busyIndex === i ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                    {i !== 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleMakeCover(i, e)}
                        title="Set as cover"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-blue-700 hover:bg-blue-50"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(i, e)}
                      title="Remove"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* When exactly one image exists, still offer a remove action */}
      {images.length === 1 && (
        <button
          type="button"
          onClick={(e) => handleDelete(0, e)}
          disabled={busyIndex === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {busyIndex === 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {busyIndex === 0 ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  )
}
