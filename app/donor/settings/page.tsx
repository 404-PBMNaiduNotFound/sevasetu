"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { logoutUser } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import {
  updateUser,
  deleteDonorAccount,
  getFavoriteOrgIds,
  getOrganization,
  toggleFavoriteOrg,
  type OrganizationDoc,
  type UserDoc,
} from "@/lib/firestore"
import { fileToCompressedDataURL, approxBase64Bytes, ImageTooLargeError } from "@/lib/imageUtils"
import {
  Camera, Loader2, LogOut, Trash2, User, Phone, MapPin,
  Save, Heart, Building2, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteUser } from "firebase/auth"
import { LocationPickerMap } from "@/components/map/LocationPickerMap"
import { reverseGeocode } from "@/lib/geocode"

const MAX_AVATAR_BYTES = 400 * 1024

function validatePhone(phone: string): boolean {
  if (!phone || phone.trim() === "") return true
  const cleaned = phone.trim().replace(/[\s\-()]/g, "")
  return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned)
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, userDoc, refreshUserDoc } = useAuth()

  // ── Profile photo ──
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Profile form ──
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", city: "", state: "" })
  // Separate, explicit state for the picked map location — not derived from userDoc fields
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null)
  // Ref mirrors state so handleSaveProfile always reads the latest value without stale closure
  const pickedLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // ── Favourites ──
  const [favOrgs, setFavOrgs] = useState<OrganizationDoc[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [unfavActing, setUnfavActing] = useState<string | null>(null)

  // ── Delete account ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Sync form from userDoc (runs once on mount when userDoc becomes available)
  useEffect(() => {
    if (!userDoc) return
    setPhotoPreview(userDoc.photoURL || null)
    setProfileForm({
      name: userDoc.name || "",
      phone: userDoc.phone || "",
      city: userDoc.city || "",
      state: (userDoc as any).state || "",
    })
    // Restore saved pin — cast because UserDoc now has lat/lng
    const lat = (userDoc as UserDoc & { lat?: number }).lat
    const lng = (userDoc as UserDoc & { lng?: number }).lng
    if (lat && lng && lat !== 0 && lng !== 0) {
      const saved = { lat, lng }
      setPickedLocation(saved)
      pickedLocationRef.current = saved
    }
  }, [userDoc])

  // Load favourite orgs
  useEffect(() => {
    if (!user?.uid) return
    setFavLoading(true)
    getFavoriteOrgIds(user.uid)
      .then(async (ids) => {
        if (ids.length === 0) { setFavOrgs([]); return }
        const orgs = await Promise.all(ids.map((id) => getOrganization(id)))
        setFavOrgs(orgs.filter(Boolean) as OrganizationDoc[])
      })
      .catch(console.error)
      .finally(() => setFavLoading(false))
  }, [user?.uid])

  const handleLogout = async () => {
    try { await logoutUser(); router.push("/login") }
    catch (error) { console.error("Logout failed:", error) }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return
    setPhotoError(null)
    setUploadingPhoto(true)
    try {
      const dataUrl = await fileToCompressedDataURL(file)
      if (approxBase64Bytes(dataUrl) > MAX_AVATAR_BYTES) {
        setPhotoError("Image is too large after compression. Try a smaller photo.")
        return
      }
      setPhotoPreview(dataUrl)
      await updateUser(user.uid, { photoURL: dataUrl })
      await refreshUserDoc()
    } catch (err) {
      console.error("Photo upload failed:", err)
      setPhotoError(
        err instanceof ImageTooLargeError ? err.message
          : err instanceof Error ? err.message
          : "Upload failed. Please try again."
      )
      setPhotoPreview(userDoc?.photoURL || null)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.uid) return
    const phone = profileForm.phone.trim()
    if (phone && !validatePhone(phone)) {
      setPhoneError("Please enter a valid Indian mobile number (e.g. +91 9876543210)")
      return
    }
    setPhoneError(null)
    setSavingProfile(true)
    try {
      // Read from ref — guaranteed to be latest even after async gaps
      const loc = pickedLocationRef.current
      const locationFields =
        loc && loc.lat !== 0 && loc.lng !== 0
          ? { lat: loc.lat, lng: loc.lng }
          : {}

      await updateUser(user.uid, {
        name: profileForm.name.trim(),
        phone,
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        ...locationFields,
      } as any)

      await refreshUserDoc()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (error) {
      console.error("Failed to save profile:", error)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUnfavourite = async (orgId: string) => {
    if (!user?.uid) return
    setUnfavActing(orgId)
    try {
      await toggleFavoriteOrg(user.uid, orgId)
      setFavOrgs((prev) => prev.filter((o) => (o.orgId || o.uid) !== orgId))
    } catch (error) {
      console.error("Failed to unfavourite org:", error)
    } finally {
      setUnfavActing(null)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.uid || deleteConfirmText !== "DELETE") return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteDonorAccount(user.uid)
      await deleteUser(user)
      router.push("/login")
    } catch (err) {
      console.error("Account deletion failed:", err)
      setDeleteError(err instanceof Error ? err.message : "Deletion failed. Please try again.")
      setDeleting(false)
    }
  }

  const initials = (userDoc?.name || "D")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <header>
          <h1 className="text-2xl text-white font-bold md:text-3xl">Settings</h1>
          <p className="mt-2 text-sm text-white">Manage your account preferences.</p>
        </header>
      </div>

      {/* Profile Photo */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Profile Photo</h2>
        <p className="mt-1 text-sm text-muted-foreground">This photo appears on your donor profile.</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative shrink-0">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {initials}
              </span>
            )}
            <label
              className={`absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors ${uploadingPhoto ? "opacity-60 pointer-events-none" : ""}`}
              title="Change photo"
            >
              {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handlePhotoChange}
                disabled={uploadingPhoto}
              />
            </label>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo.</p>
            {photoError && (
              <p className="mt-1.5 text-xs font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg inline-block">
                {photoError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-name">Full Name</Label>
            <Input
              id="s-name"
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-email">Email Address</Label>
            <Input
              id="s-email"
              type="email"
              value={userDoc?.email || ""}
              disabled
              className="h-11 rounded-xl opacity-60"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-phone">Phone Number</Label>
            <Input
              id="s-phone"
              value={profileForm.phone}
              onChange={(e) => {
                setProfileForm((f) => ({ ...f, phone: e.target.value }))
                setPhoneError(null)
              }}
              placeholder="+91 9876543210"
              className={`h-11 rounded-xl ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {phoneError
              ? <p className="text-xs font-medium text-destructive">{phoneError}</p>
              : <p className="text-xs text-muted-foreground">Used by organizations to contact you</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-city" className="flex items-center gap-1.5">
              City
              {geocoding && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </Label>
            <Input
              id="s-city"
              value={profileForm.city}
              onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Auto-filled from map pin"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="s-state" className="flex items-center gap-1.5">
              State
              {geocoding && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </Label>
            <Input
              id="s-state"
              value={profileForm.state}
              onChange={(e) => setProfileForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="Auto-filled from map pin"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Map Location Picker — no addressHint to prevent Hyderabad default */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label>Pin Your Location on Map</Label>
            <p className="text-xs text-muted-foreground">
              Click on the map or tap "Use My Location" to pin your exact spot, then hit <strong>Save Changes</strong>.
            </p>
            <LocationPickerMap
              isReady={!!userDoc}
              initialLat={pickedLocation?.lat}
              initialLng={pickedLocation?.lng}
              onLocationPicked={async (coords) => {
                // Update both state and ref immediately
                setPickedLocation(coords)
                pickedLocationRef.current = coords
                // Auto-fill city & state via reverse geocode
                if (coords.lat !== 0 && coords.lng !== 0) {
                  setGeocoding(true)
                  try {
                    const place = await reverseGeocode(coords)
                    if (place) {
                      setProfileForm((f) => ({
                        ...f,
                        city: place.city || f.city,
                        state: place.state || f.state,
                      }))
                    }
                  } finally {
                    setGeocoding(false)
                  }
                }
              }}
              height="240px"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">City &amp; state personalise your recommendations.</p>
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="gap-2 rounded-xl"
          >
            {savingProfile
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : profileSaved
              ? <><Save className="h-4 w-4" /> Saved!</>
              : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </div>

      {/* Favourite Orgs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-bold text-foreground">Favourite Organizations</h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">Organizations you have bookmarked for quick access.</p>

        {favLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : favOrgs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No favourite organizations yet.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Tap the heart icon on any organization to save it here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {favOrgs.map((org) => {
              const orgId = org.orgId || org.uid
              const isActing = unfavActing === orgId
              return (
                <div
                  key={orgId}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                    {(org.organizationName ?? org.name ?? "O")[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{org.organizationName ?? org.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {org.city && <><MapPin className="h-3 w-3" />{org.city}{org.state ? `, ${org.state}` : ""}</>}
                      {org.category && <span className="ml-1">{org.category}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnfavourite(orgId)}
                    disabled={isActing}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-60"
                    aria-label={`Remove ${org.organizationName ?? org.name} from favourites`}
                    title="Remove from favourites"
                  >
                    {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="rounded-2xl border border-destructive/20 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign out of your donor account on this device.</p>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="mt-4 gap-2 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Delete Account */}
      <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">Delete Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="mt-4 gap-2 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        ) : (
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              This will permanently delete your account, all your donations, and all related records.
            </p>
            <p className="text-sm text-muted-foreground">
              Type <span className="font-bold text-foreground">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            {deleteError && (
              <p className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                variant="destructive"
                className="gap-2 rounded-xl"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Deleting…" : "Confirm Delete"}
              </Button>
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText("")
                  setDeleteError(null)
                }}
                variant="outline"
                className="rounded-xl"
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}