import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts a Firestore Timestamp OR a plain {seconds, nanoseconds}
 * serialized object to a Date. Returns null if the value is falsy or invalid.
 */
export function tsToDate(ts: any): Date | null {
  if (!ts) return null
  let date: Date | null = null
  
  if (ts instanceof Date) {
    date = ts
  } else if (typeof ts === "string") {
    date = new Date(ts)
  } else if (typeof ts === "number") {
    date = new Date(ts)
  } else if (typeof ts.toDate === "function") {
    date = ts.toDate()
  } else if (typeof ts.seconds === "number") {
    date = new Date(ts.seconds * 1000)
  } else if (typeof ts._seconds === "number") {
    date = new Date(ts._seconds * 1000)
  }
  
  if (!date || isNaN(date.getTime())) return null
  return date
}

/**
 * Formats a Firestore Timestamp (or plain serialized object) as a locale date string.
 * Returns "—" if the value is falsy or invalid.
 */
export function formatFirestoreDate(ts: any, locale = "en-IN"): string {
  const date = tsToDate(ts)
  if (!date) return "—"
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
}
