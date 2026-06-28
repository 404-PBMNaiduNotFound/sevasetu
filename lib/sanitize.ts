// lib/sanitize.ts
// Utility: strip undefined values before any Firestore write.
// Firestore throws if you pass `undefined` as a field value.

/**
 * Recursively removes all keys whose value is `undefined` from a plain object.
 * Returns a `Record<string, unknown>` so Firestore's `updateDoc` / `setDoc`
 * overloads (which expect `UpdateData<T>`) accept the result without an extra cast.
 * Arrays are returned as-is (Firestore handles array members separately).
 *
 * Firestore FieldValue sentinels (serverTimestamp, deleteField, arrayUnion, etc.)
 * are plain objects internally with no enumerable keys — we must preserve them
 * as-is rather than recursing into them, otherwise they get stripped.
 */

function isFirestoreFieldValue(value: unknown): boolean {
  // FieldValue sentinels carry a private _methodName or have a specific constructor name
  if (value === null || typeof value !== "object") return false
  const name = (value as any)?.constructor?.name ?? ""
  // Firebase JS SDK v9+ uses classes like "FieldValue", "TimestampFieldValueImpl", etc.
  return (
    name.toLowerCase().includes("fieldvalue") ||
    typeof (value as any)._methodName === "string" ||
    typeof (value as any)._delegate?._methodName === "string"
  )
}

export function sanitizeData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !isFirestoreFieldValue(value)
    ) {
      const nested = sanitizeData(value as Record<string, unknown>)
      if (Object.keys(nested).length > 0) {
        result[key] = nested
      }
    } else {
      result[key] = value
    }
  }
  return result
}