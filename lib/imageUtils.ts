// lib/imageUtils.ts
// Converts an image File into a compressed base64 data URL so it can be
// stored directly in a Firestore document (no Storage bucket needed).
//
// Firestore documents have a 1MB hard limit, and OrganizationDoc.photoURLs
// can hold several images, so every image is downscaled + re-encoded as
// JPEG before being turned into base64.

const MAX_DIMENSION = 1280 // px, longest side
const JPEG_QUALITY = 0.72  // 0–1
const MAX_SOURCE_BYTES = 8 * 1024 * 1024 // 8 MB raw upload cap

export class ImageTooLargeError extends Error {}

/**
 * Reads a File, downsamples it on a canvas, and resolves to a base64
 * JPEG data URL (e.g. "data:image/jpeg;base64,/9j/4AAQSk...").
 */
export function fileToCompressedDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not an image."))
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new ImageTooLargeError("Image is too large (max 8 MB)."))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the selected file."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Could not decode the selected image."))
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height / width) * MAX_DIMENSION)
            width = MAX_DIMENSION
          } else {
            width = Math.round((width / height) * MAX_DIMENSION)
            height = MAX_DIMENSION
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser."))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
        resolve(dataUrl)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Rough byte size of a base64 data URL (for client-side sanity checks). */
export function approxBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",")
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl
  return Math.round((base64.length * 3) / 4)
}
