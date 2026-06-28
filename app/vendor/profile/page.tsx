'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { File, Edit2, Check, X, Lock } from 'lucide-react'
import { AddressMapPin } from '@/components/map/AddressMapPin'
import { LocationPickerMap } from '@/components/map/LocationPickerMap'
import { reverseGeocode } from '@/lib/geocode'
import { StatusPill } from '@/components/vendor/status-pill'
import { VerificationBanner } from '@/components/vendor/verification-banner'
import { useAuth } from '@/lib/auth-context'
import { formatFirestoreDate } from '@/lib/utils'
import {
  getVendor,
  getVendorDocuments,
  upsertVendor,
  type VendorDoc,
  type VendorDocumentDoc,
} from '@/lib/firestore'

const profileSchema = z.object({
  businessName: z.string().min(3),
  ownerName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10}$/),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().regex(/^\d{5,6}$/),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function VendorProfile() {
  const { user } = useAuth()
  const vendorId = user?.uid ?? ''

  const [vendor, setVendor] = useState<VendorDoc | null>(null)
  const [documents, setDocuments] = useState<VendorDocumentDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const pickedLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (!vendorId) return

    const fetchData = async () => {
      try {
        const [vendorData, docsData] = await Promise.all([
          getVendor(vendorId),
          getVendorDocuments(vendorId),
        ])

        if (vendorData) {
          setVendor(vendorData)
          if (vendorData.lat && vendorData.lng && vendorData.lat !== 0) {
            const saved = { lat: vendorData.lat, lng: vendorData.lng }
            setPickedLocation(saved)
            pickedLocationRef.current = saved
          }
          form.reset({
            businessName: vendorData.businessName,
            ownerName: vendorData.ownerName,
            email: vendorData.email,
            phone: vendorData.phone,
            address: vendorData.address,
            city: vendorData.city,
            state: vendorData.state,
            zipCode: vendorData.zipCode,
          })
        }

        setDocuments(docsData)
      } catch (error) {
        console.error('Error fetching vendor data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [vendorId, form])

  const handleSave = async (data: ProfileFormData) => {
    if (!vendor) return

    setIsSaving(true)
    try {
      const loc = pickedLocationRef.current
      const locationFields =
        loc && loc.lat !== 0 && loc.lng !== 0
          ? { lat: loc.lat, lng: loc.lng }
          : {}

      const saveData: Partial<VendorDoc> = { ...data, ...locationFields }

      await upsertVendor(vendorId, saveData)

      setVendor((prev) => prev ? { ...prev, ...saveData } : prev)
      setIsEditing(false)
      alert('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-muted" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Vendor profile not found</p>
        </div>
      </div>
    )
  }

  const fieldLabel = (text: string, spinning?: boolean) => (
    <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
      {text}
      {spinning && isEditing && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      )}
    </label>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-blue-700 p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Vendor Profile</h1>
            <p className="mt-2 text-sm text-white/80">{vendor.businessName}</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm" className="gap-2">
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Verification Banner */}
      <div className="mb-6">
        <VerificationBanner status={vendor.approvalStatus} />
      </div>

      {/* Business Information */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">Business Information</h2>

        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              {fieldLabel('Business Name')}
              <Input {...form.register('businessName')} disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('Owner Name')}
              <Input {...form.register('ownerName')} disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('Email')}
              <Input {...form.register('email')} type="email" disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('Phone')}
              <Input {...form.register('phone')} disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('Address', geocoding)}
              <Input {...form.register('address')} disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('City', geocoding)}
              <Input {...form.register('city')} disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('State', geocoding)}
              <Input {...form.register('state')} disabled={!isEditing} className="w-full" />
            </div>
            <div>
              {fieldLabel('Zip Code')}
              <Input {...form.register('zipCode')} disabled={!isEditing} className="w-full" />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 border-t border-border pt-5">
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Check className="h-4 w-4" /> Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  form.reset()
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          )}

          {!isEditing && (
            <div className="border-t border-border pt-5">
              <p className="mb-3 text-sm font-medium text-foreground">Location on Map</p>
              <AddressMapPin
                address={vendor.address}
                city={vendor.city}
                state={vendor.state}
                zipCode={vendor.zipCode}
                savedLat={vendor.lat}
                savedLng={vendor.lng}
                label={vendor.businessName}
                type="vendor"
                height="220px"
              />
            </div>
          )}

          {isEditing && (
            <div className="border-t border-border pt-5">
              <p className="mb-1 text-sm font-medium text-foreground">Pin Exact Location on Map</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Click on the map or use GPS to pin your precise location.
                It will be saved when you hit <strong>Save Changes</strong>.
              </p>
              <LocationPickerMap
                isReady={!isLoading}
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
                        form.setValue('city', place.city || form.getValues('city'), { shouldValidate: true })
                        form.setValue('state', place.state || form.getValues('state'), { shouldValidate: true })
                        form.setValue('address', place.address || form.getValues('address'), { shouldValidate: true })
                      }
                    } finally {
                      setGeocoding(false)
                    }
                  }
                }}
                height="260px"
              />
            </div>
          )}
        </form>
      </div>

      {/* Bank Details */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">Bank Details</h2>
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Holder</p>
            <p className="mt-1.5 font-semibold text-foreground">{vendor.bankAccountHolder}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Name</p>
            <p className="mt-1.5 font-semibold text-foreground">{vendor.bankName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Number</p>
            <p className="mt-1.5 font-mono font-semibold text-foreground">
              {'*'.repeat(vendor.bankAccountNumber.length - 4) + vendor.bankAccountNumber.slice(-4)}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Bank details are encrypted and secured. Contact support to update these details.
          </p>
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-5 text-base font-bold text-foreground">Documents</h2>
        {documents.length === 0 ? (
          <div className="py-10 text-center">
            <File className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No documents uploaded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <File className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatFirestoreDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={doc.status} size="sm" />
                  <Button variant="ghost" size="sm">Download</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
