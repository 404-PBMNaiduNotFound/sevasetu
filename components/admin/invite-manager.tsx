"use client"

import { useEffect, useState } from "react"
import {
  Mail, Trash2, Loader2, CheckCircle2,
  Clock, Copy, Check, PlusCircle, Phone, Pencil, Save, X,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  createInviteToken,
  getAllInvites,
  revokeInviteToken,
  type InviteDoc,
} from "@/lib/firestore"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://sevasetuproject.vercel.app"
}

function inviteLink(token: string) {
  return `${getAppUrl()}/org/register?invite=${token}`
}

function timeAgo(ts: any): string {
  if (!ts) return "—"
  // serverTimestamp() returns a sentinel object immediately after write
  // (before Firestore confirms). It has no .seconds and no .toDate().
  // Guard against this so we never show "NaNd ago".
  if (typeof ts === "object" && ts._methodName === "serverTimestamp") return "just now"
  const date: Date =
    typeof ts.toDate === "function"
      ? ts.toDate()
      : typeof ts.seconds === "number"
        ? new Date(ts.seconds * 1000)
        : new Date(ts)
  if (!date || isNaN(date.getTime())) return "just now"
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60)    return "just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Contact Info Editor ───────────────────────────────────────────────────────

function ContactInfoEditor() {
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [editing, setEditing]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [loadingContact, setLoadingContact] = useState(true)

  useEffect(() => {
    getDoc(doc(db, "settings", "contact"))
      .then((snap) => {
        if (snap.exists()) {
          setContactEmail(snap.data().email ?? "")
          setContactPhone(snap.data().phone ?? "")
        }
      })
      .catch(console.error)
      .finally(() => setLoadingContact(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, "settings", "contact"), {
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      })
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Contact Info for Orgs</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Shown to organizations on the registration page when they need to reach you.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {loadingContact ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : editing ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp / Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {saved && (
            <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved successfully
            </p>
          )}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">{contactEmail || <span className="text-gray-400 italic">No email set</span>}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <Phone className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700">{contactPhone || <span className="text-gray-400 italic">No phone set</span>}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main InviteManager ────────────────────────────────────────────────────────

export function InviteManager() {
  const { user } = useAuth()
  const [invites, setInvites]           = useState<InviteDoc[]>([])
  const [loading, setLoading]           = useState(true)
  const [email, setEmail]               = useState("")
  const [creating, setCreating]         = useState(false)
  const [createError, setCreateError]   = useState<string | null>(null)
  const [copiedToken, setCopiedToken]   = useState<string | null>(null)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)
  const [newToken, setNewToken]         = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setInvites(await getAllInvites()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!user?.uid || !email.trim()) return
    setCreating(true)
    setCreateError(null)
    setNewToken(null)
    try {
      const token = await createInviteToken(user.uid, email.trim())
      setNewToken(token)
      setEmail("")
      await load()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create invite.")
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(inviteLink(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRevoke = async (token: string) => {
    if (!confirm("Revoke this invite? The link will stop working immediately.")) return
    setRevokingToken(token)
    try { await revokeInviteToken(token); await load() }
    catch (e) { console.error(e) }
    finally { setRevokingToken(null) }
  }

  const unused = invites.filter((i) => !i.used)
  const used   = invites.filter((i) => i.used)

  return (
    <div className="space-y-8">

      {/* ── Contact Info Editor ── */}
      <ContactInfoEditor />

      {/* ── Create Invite ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Create Org Invite</h2>
        <p className="mb-5 text-sm text-gray-500">
          Enter the organization's email, generate a one-time link, then send it via WhatsApp or email.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="org@example.com"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !email.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Generate Link
          </button>
        </div>

        {createError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
        )}

        {newToken && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">New invite link — copy and send this</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-gray-800 border border-blue-100">
                {inviteLink(newToken)}
              </code>
              <button
                onClick={() => handleCopy(newToken)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
              >
                {copiedToken === newToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active invites ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Active Invites
          <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-700">{unused.length}</span>
        </h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : unused.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No active invites. Create one above.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {unused.map((inv) => (
              <div key={inv.token} className="flex flex-wrap items-center gap-3 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-400">Created {timeAgo(inv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(inv.token)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {copiedToken === inv.token
                      ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</>
                      : <><Copy className="h-3.5 w-3.5" /> Copy Link</>}
                  </button>
                  <button
                    onClick={() => handleRevoke(inv.token)}
                    disabled={revokingToken === inv.token}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {revokingToken === inv.token
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Used invites ── */}
      {used.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Used Invites
            <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-semibold text-green-700">{used.length}</span>
          </h2>
          <div className="divide-y divide-gray-100">
            {used.map((inv) => (
              <div key={inv.token} className="flex flex-wrap items-center gap-3 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-400">Registered {timeAgo(inv.usedAt)}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Registered</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
