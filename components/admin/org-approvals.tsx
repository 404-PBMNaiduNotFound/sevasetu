"use client"

import { useEffect, useState, useCallback } from "react"
import { Building2, Loader2, Check, X, MapPin, Mail, Phone, CheckCircle2, Clock } from "lucide-react"
import {
  getPendingOrganizations,
  approveOrganization,
  rejectOrganization,
  type OrganizationDoc,
} from "@/lib/firestore"

export function OrgApprovals() {
  const [orgs, setOrgs] = useState<OrganizationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOnId, setActingOnId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPendingOrganizations()
      setOrgs(data)
    } catch (e) {
      console.error("Failed to load pending organizations:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove(orgId: string, name: string) {
    setActingOnId(orgId)
    try {
      await approveOrganization(orgId)
      setOrgs((prev) => prev.filter((o) => (o.uid ?? o.orgId) !== orgId))
      showToast(`${name} approved and is now live on the site.`)
    } catch (e) {
      console.error("Failed to approve organization:", e)
    } finally {
      setActingOnId(null)
    }
  }

  async function handleReject(orgId: string, name: string) {
    setActingOnId(orgId)
    try {
      await rejectOrganization(orgId)
      setOrgs((prev) => prev.filter((o) => (o.uid ?? o.orgId) !== orgId))
      showToast(`${name} was rejected.`)
    } catch (e) {
      console.error("Failed to reject organization:", e)
    } finally {
      setActingOnId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-lg font-bold text-gray-900">Organization Approvals</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Review new organization signups before they appear publicly on the site.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            <Clock className="h-3 w-3" />
            {orgs.length} pending
          </span>
        </div>
      </div>

      {/* Success toast */}
      {toast && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : orgs.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No organizations awaiting approval.
          </p>
        ) : (
          orgs.map((org) => {
            const id = org.uid ?? org.orgId ?? ""
            const isActing = actingOnId === id
            const displayName = org.organizationName ?? org.name ?? "Unnamed Organization"
            const location = [org.city, org.state].filter(Boolean).join(", ") || org.address || ""
            const cover = org.photoURLs?.[0]

            return (
              <div key={id} className="flex items-start gap-4 px-6 py-4">
                {/* Avatar / cover thumb */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-50 text-purple-700">
                  {cover ? (
                    <img src={cover} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                  {org.email && (
                    <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                      <Mail className="h-3 w-3 shrink-0" />
                      {org.email}
                    </p>
                  )}
                  {org.phone && (
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone className="h-3 w-3 shrink-0" />
                      {org.phone}
                    </p>
                  )}
                  {location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {location}
                    </p>
                  )}
                  {org.category && (
                    <span className="mt-1.5 inline-flex w-fit rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                      {org.category}
                    </span>
                  )}
                  {org.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{org.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleApprove(id, displayName)}
                    disabled={isActing || !id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                  >
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(id, displayName)}
                    disabled={isActing || !id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 px-3.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
