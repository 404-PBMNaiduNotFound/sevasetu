"use client"

// Example: app/org/settings/page.tsx  (or wherever your org profile form lives)
// Shows how to drop <OrgImageUpload> into an existing org settings page.

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"           // your existing auth hook
import { getOrganization } from "@/lib/firestore"
import type { OrganizationDoc } from "@/lib/firestore"
import { OrgImageUpload } from "@/components/OrgImageUpload"

export default function OrgSettingsPage() {
  const { user } = useAuth()
  const [org, setOrg] = useState<OrganizationDoc | null>(null)

  useEffect(() => {
    if (!user?.uid) return
    getOrganization(user.uid).then(setOrg)
  }, [user?.uid])

  if (!org) return <p>Loading…</p>

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>

      {/* ── Image Upload Section ───────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">Profile Image</h2>

        <OrgImageUpload
          orgId={org.uid}
          currentPhotoURL={org.photoURL}
          onUploadSuccess={(url) => {
            // Optimistically update local state so OrgCard previews work
            setOrg((prev) => prev ? { ...prev, photoURL: url } : prev)
          }}
          onDeleteSuccess={() => {
            setOrg((prev) => prev ? { ...prev, photoURL: undefined } : prev)
          }}
        />
      </section>

      {/* ── Your other settings fields go below ──────── */}
      {/* <OrgProfileForm org={org} /> */}
    </div>
  )
}