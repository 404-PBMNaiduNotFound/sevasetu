"use client"

import { useEffect, useRef, useState } from "react"
import { User, Save, LogOut, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getOrganization, upsertOrganization, type OrganizationDoc, deleteOrganizationAccount } from "@/lib/firestore"
import { logoutUser } from "@/lib/auth"
import { Spinner } from "@/components/ui/spinner"
import { OrgImageUpload } from "@/components/OrgImageUpload"
import { deleteUser } from "firebase/auth"
import { LocationPickerMap } from "@/components/map/LocationPickerMap"
import { reverseGeocode } from "@/lib/geocode"

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
      {children}
    </label>
  )
}

function ProfileTab() {
  const { user } = useAuth()
  const [draft, setDraft] = useState<Partial<OrganizationDoc>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Track the picked location separately so it is always included in the save
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null)
  // Ref mirrors state so handleSave always reads the latest value without stale closure
  const pickedLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    getOrganization(user.uid)
      .then((data) => {
        setDraft(data || {})
        // Restore previously saved pin
        if (data?.lat && data?.lng && data.lat !== 0) {
          const saved = { lat: data.lat, lng: data.lng }
          setPickedLocation(saved)
          pickedLocationRef.current = saved
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user?.uid])

  const update = (key: keyof OrganizationDoc, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const handleSave = async () => {
    if (!user?.uid) return
    setSaving(true)
    try {
      // Always merge the latest picked location into the payload
      const payload: Partial<OrganizationDoc> = {
        ...draft,
        ...(pickedLocationRef.current && pickedLocationRef.current.lat !== 0
          ? { lat: pickedLocationRef.current.lat, lng: pickedLocationRef.current.lng }
          : {}),
      }
      await upsertOrganization(user.uid, payload)
      // Keep draft in sync with what was saved
      setDraft(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Organization Details</h2>

      {/* Profile Image Upload */}
      <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 py-6">
        <p className="mb-4 text-sm font-medium text-gray-700">Organization Profile Images</p>
        {user?.uid && (
          <OrgImageUpload
            orgId={user.uid}
            currentPhotoURLs={draft.photoURLs}
            onChange={(urls) => update("photoURLs", urls)}
          />
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="orgName">Organization Name</FieldLabel>
          <input
            id="orgName"
            value={draft.organizationName || ""}
            onChange={(e) => update("organizationName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="category">Category</FieldLabel>
          <input
            id="category"
            value={draft.category || ""}
            onChange={(e) => update("category", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="city">
            City{geocoding && <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent align-middle" />}
          </FieldLabel>
          <input
            id="city"
            value={draft.city || ""}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="state">
            State{geocoding && <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent align-middle" />}
          </FieldLabel>
          <input
            id="state"
            value={draft.state || ""}
            onChange={(e) => update("state", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="address">
            Address{geocoding && <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent align-middle" />}
          </FieldLabel>
          <input
            id="address"
            value={draft.address || ""}
            onChange={(e) => update("address", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Location Picker — addressHint intentionally NOT passed to avoid Hyderabad bug */}
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="map-picker">Pin Exact Location on Map</FieldLabel>
          <p className="text-xs text-gray-500 mb-2">
            Click on the map or use GPS to pin your exact location.
            Hit <strong>Save</strong> below to persist it.
          </p>
          <LocationPickerMap
            isReady={!loading}
            initialLat={pickedLocation?.lat}
            initialLng={pickedLocation?.lng}
            onLocationPicked={async (coords) => {
                setPickedLocation(coords)
                pickedLocationRef.current = coords
                if (coords.lat !== 0 && coords.lng !== 0) {
                  setGeocoding(true)
                  try {
                    const place = await reverseGeocode(coords)
                    if (place) {
                      update("city", place.city || draft.city || "")
                      update("state", place.state || draft.state || "")
                      update("address", place.address || draft.address || "")
                    }
                  } finally {
                    setGeocoding(false)
                  }
                }
              }}
            height="280px"
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <textarea
            id="description"
            rows={4}
            value={draft.description || ""}
            onChange={(e) => update("description", e.target.value)}
            className={`${inputClass} leading-relaxed`}
          />
        </div>
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            type="email"
            value={draft.email || ""}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <input
            id="phone"
            value={draft.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saved ? "Saved!" : saving ? "Saving…" : "Update Details"}
        </button>
      </div>
    </div>
  )
}

function LogoutSection() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm lg:p-8">
      <h2 className="text-lg font-bold text-gray-900">Logout</h2>
      <p className="mt-1 text-sm text-gray-600">Sign out of your organization account.</p>
      <div className="mt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-red-200 px-6 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )
}

function DeleteAccountSection() {
  const router = useRouter()
  const { user } = useAuth()

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!user?.uid || confirmText !== "DELETE") return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteOrganizationAccount(user.uid)
      await deleteUser(user)
      router.push("/login")
    } catch (err) {
      console.error("Account deletion failed:", err)
      setDeleteError(
        err instanceof Error ? err.message : "Deletion failed. Please try again."
      )
      setDeleting(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-sm lg:p-8">
      <h2 className="text-lg font-bold text-gray-900">Delete Account</h2>
      <p className="mt-1 text-sm text-gray-600">
        Permanently delete your organization account and all associated data. This action cannot be undone.
      </p>

      {!showConfirm ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-red-200 px-6 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-medium text-red-700">
            This will permanently delete your organization, all slots, requirements, donations, and related records.
          </p>
          <p className="text-sm text-gray-600">
            Type <span className="font-bold text-gray-900">DELETE</span> to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {deleteError && (
            <p className="text-xs font-medium text-red-600 bg-red-100 px-3 py-1.5 rounded-lg">
              {deleteError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? "Deleting…" : "Confirm Delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false)
                setConfirmText("")
                setDeleteError(null)
              }}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function OrgSettings() {
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8 overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-white">Manage your organization account and preferences.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <span className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white">
          <User className="h-4 w-4" />
          Profile
        </span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <ProfileTab />
      </div>

      <LogoutSection />
      <DeleteAccountSection />
    </div>
  )
}