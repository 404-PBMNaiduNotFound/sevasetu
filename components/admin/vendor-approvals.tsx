"use client"

import { useEffect, useState, useCallback } from "react"
import { Store, Loader2, Check, X, MapPin, Mail, Phone, CheckCircle2, Clock, FileText, ExternalLink } from "lucide-react"
import {
  getPendingVendors,
  approveVendor,
  rejectVendor,
  getVendorDocuments,
  type VendorDoc,
  type VendorDocumentDoc,
} from "@/lib/firestore"

export function VendorApprovals() {
  const [vendors, setVendors] = useState<VendorDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOnId, setActingOnId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // documents are fetched lazily per-vendor when the admin expands a row,
  // keyed by vendorId, so the list view stays fast for many pending vendors
  const [openDocsFor, setOpenDocsFor] = useState<string | null>(null)
  const [docsByVendor, setDocsByVendor] = useState<Record<string, VendorDocumentDoc[]>>({})
  const [loadingDocs, setLoadingDocs] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPendingVendors()
      setVendors(data)
    } catch (e) {
      console.error("Failed to load pending vendors:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPending() }, [loadPending])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleDocs(vendorId: string) {
    if (openDocsFor === vendorId) {
      setOpenDocsFor(null)
      return
    }
    setOpenDocsFor(vendorId)
    if (!docsByVendor[vendorId]) {
      setLoadingDocs(vendorId)
      try {
        const docs = await getVendorDocuments(vendorId)
        setDocsByVendor((prev) => ({ ...prev, [vendorId]: docs }))
      } catch (e) {
        console.error("Failed to load vendor documents:", e)
      } finally {
        setLoadingDocs(null)
      }
    }
  }

  async function handleApprove(vendorId: string, name: string) {
    setActingOnId(vendorId)
    try {
      await approveVendor(vendorId)
      setVendors((prev) => prev.filter((v) => v.uid !== vendorId))
      showToast(`${name} approved and can now access the vendor dashboard.`)
    } catch (e) {
      console.error("Failed to approve vendor:", e)
    } finally {
      setActingOnId(null)
    }
  }

  async function handleReject(vendorId: string, name: string) {
    setActingOnId(vendorId)
    try {
      await rejectVendor(vendorId)
      setVendors((prev) => prev.filter((v) => v.uid !== vendorId))
      showToast(`${name} was rejected.`)
    } catch (e) {
      console.error("Failed to reject vendor:", e)
    } finally {
      setActingOnId(null)
    }
  }

  const documentTypeLabels: Record<VendorDocumentDoc["documentType"], string> = {
    business_license: "Business License",
    tax_certificate: "Tax Certificate",
    bank_statement: "Bank Statement",
    identity: "Identity Document",
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-lg font-bold text-gray-900">Vendor Approvals</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Review new vendor signups and their uploaded documents before approving.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            <Clock className="h-3 w-3" />
            {vendors.length} pending
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
        ) : vendors.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No vendors awaiting approval.
          </p>
        ) : (
          vendors.map((vendor) => {
            const id = vendor.uid
            const isActing = actingOnId === id
            const displayName = vendor.businessName ?? "Unnamed Vendor"
            const location = [vendor.city, vendor.state].filter(Boolean).join(", ") || vendor.address || ""
            const docsOpen = openDocsFor === id
            const docs = docsByVendor[id] ?? []

            return (
              <div key={id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50 text-orange-700">
                    <Store className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-400">{vendor.ownerName}</p>
                    {vendor.email && (
                      <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                        <Mail className="h-3 w-3 shrink-0" />
                        {vendor.email}
                      </p>
                    )}
                    {vendor.phone && (
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        {vendor.phone}
                      </p>
                    )}
                    {location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {location}
                      </p>
                    )}

                    <button
                      onClick={() => toggleDocs(id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                    >
                      <FileText className="h-3 w-3" />
                      {docsOpen ? "Hide documents" : "Review documents"}
                    </button>
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

                {/* Document review panel */}
                {docsOpen && (
                  <div className="ml-15 mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    {loadingDocs === id ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : docs.length === 0 ? (
                      <p className="text-xs text-gray-400">No documents uploaded.</p>
                    ) : (
                      <ul className="space-y-2">
                        {docs.map((doc) => (
                          <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-700">
                              <FileText className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium">{documentTypeLabels[doc.documentType]}</span>
                              <span className="text-gray-400">— {doc.fileName}</span>
                            </div>
                            <button
  onClick={() => {
    const link = document.createElement('a')
    link.href = doc.fileUrl
    link.download = doc.fileName
    link.click()
  }}
  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
>
  View <ExternalLink className="h-3 w-3" />
</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}