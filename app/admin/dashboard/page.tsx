"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Users, Building2, MailCheck, Trash2, Loader2, Search, AlertTriangle, X, CheckCircle2, Store, LogOut, KeyRound, Save, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { InviteManager } from "@/components/admin/invite-manager"
import { OrgApprovals } from "@/components/admin/org-approvals"
import { VendorApprovals } from "@/components/admin/vendor-approvals"
import { Spinner } from "@/components/ui/spinner"
import {
  getUser,
  deleteDonorAccount,
  deleteOrganizationAccount,
  getAllVendorsForAdmin,
  type UserDoc,
  type OrganizationDoc,
  type VendorDoc,
} from "@/lib/firestore"
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { logoutUser } from "@/lib/auth"

// ── User Management Section ───────────────────────────────────────────────────

type UserEntry = {
  uid: string
  name: string
  email: string
  role: "donor" | "organization" | "vendor"
  phone?: string
}

function ConfirmDeleteModal({
  user,
  onConfirm,
  onCancel,
  deleting,
}: {
  user: UserEntry
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base">Delete account permanently?</h3>
            <p className="mt-1 text-sm text-gray-500">
              This will delete <span className="font-medium text-gray-800">{user.name}</span> ({user.email}) and all their data — donations, notifications, and linked records. This cannot be undone.
            </p>
          </div>
          {!deleting && (
            <button onClick={onCancel} className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? "Deleting…" : "Yes, delete permanently"}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function UserManagement() {
  const [users, setUsers] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "donor" | "organization" | "vendor">("all")
  const [toDelete, setToDelete] = useState<UserEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deletedId, setDeletedId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch donors, orgs, and vendors in parallel
      const [donorSnap, orgSnap, vendors] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "donor"))),
        getDocs(query(collection(db, "users"), where("role", "==", "organization"))),
        getAllVendorsForAdmin(),
      ])
      const all: UserEntry[] = [
        ...donorSnap.docs.map((d) => {
          const data = d.data() as UserDoc
          return { uid: d.id, name: data.name ?? "—", email: data.email ?? "—", role: "donor" as const, phone: data.phone }
        }),
        ...orgSnap.docs.map((d) => {
          const data = d.data() as UserDoc
          return { uid: d.id, name: data.name ?? "—", email: data.email ?? "—", role: "organization" as const, phone: data.phone }
        }),
        ...vendors.map((v) => ({
          uid: v.uid,
          name: v.businessName ?? v.ownerName ?? "—",
          email: v.email ?? "—",
          role: "vendor" as const,
          phone: v.phone,
        })),
      ]
      setUsers(all.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      if (toDelete.role === "donor") {
        await deleteDonorAccount(toDelete.uid)
      } else if (toDelete.role === "organization") {
        await deleteOrganizationAccount(toDelete.uid)
      } else {
        // vendor — delete from vendors collection + users doc if exists
        const { deleteDoc, doc: firestoreDoc } = await import("firebase/firestore")
        await deleteDoc(firestoreDoc(db, "vendors", toDelete.uid))
      }
      setDeletedId(toDelete.uid)
      setUsers((prev) => prev.filter((u) => u.uid !== toDelete.uid))
      setTimeout(() => setDeletedId(null), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const donorCount = users.filter((u) => u.role === "donor").length
  const orgCount = users.filter((u) => u.role === "organization").length
  const vendorCount = users.filter((u) => u.role === "vendor").length

  const roleBadge = (role: UserEntry["role"]) => {
    if (role === "donor") return <span className="hidden shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 sm:inline-block">Donor</span>
    if (role === "organization") return <span className="hidden shrink-0 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 sm:inline-block">Org</span>
    return <span className="hidden shrink-0 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 sm:inline-block">Vendor</span>
  }

  const avatarStyle = (role: UserEntry["role"]) => {
    if (role === "donor") return "bg-blue-50 text-blue-700"
    if (role === "organization") return "bg-purple-50 text-purple-700"
    return "bg-orange-50 text-orange-700"
  }

  const filterButtons: { key: "all" | "donor" | "organization" | "vendor"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "donor", label: "Donors" },
    { key: "organization", label: "Orgs" },
    { key: "vendor", label: "Vendors" },
  ]

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-lg font-bold text-gray-900">User Management</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Remove donors, organizations, or vendors and wipe their data permanently.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">{donorCount} donors</span>
          <span className="rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700">{orgCount} organizations</span>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 font-medium text-orange-700">{vendorCount} vendors</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                roleFilter === key
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Success toast */}
      {deletedId && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Account and all associated data deleted successfully.
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            {search || roleFilter !== "all" ? "No users match your search." : "No users found."}
          </p>
        ) : (
          filtered.map((u) => (
            <div key={u.uid} className="flex items-center gap-4 px-6 py-4">
              {/* Avatar */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${avatarStyle(u.role)}`}>
                {u.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{u.name}</p>
                <p className="truncate text-xs text-gray-400">{u.email}</p>
                {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
              </div>

              {/* Role badge */}
              {roleBadge(u.role)}

              {/* Delete button */}
              <button
                onClick={() => setToDelete(u)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 transition-colors hover:bg-red-50 hover:border-red-200"
                title="Delete account"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {toDelete && (
        <ConfirmDeleteModal
          user={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}

// ── Demo Credentials Manager ─────────────────────────────────────────────────

type DemoRole = "org" | "donor" | "vendor"

type DemoEntry = {
  key: DemoRole
  label: string
  email: string
  password: string
}

const DEFAULT_DEMOS: DemoEntry[] = [
  { key: "org",    label: "Organization Demo", email: "vizagWorriers@org.in", password: "vizagWorriers@123" },
  { key: "donor",  label: "Donor Demo",        email: "Amelia@gmail.com",     password: "Amelia@123" },
  { key: "vendor", label: "Vendor Demo",       email: "book@org.in",          password: "book@123" },
]

function DemoCredentialsManager() {
  const [demos, setDemos] = useState<DemoEntry[]>(DEFAULT_DEMOS)
  const [showDemo, setShowDemo] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)

  useEffect(() => {
    getDoc(doc(db, "settings", "demoAccounts"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as { accounts?: DemoEntry[]; showDemo?: boolean }
          if (data.accounts?.length) setDemos(data.accounts)
          if (typeof data.showDemo === "boolean") setShowDemo(data.showDemo)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key: DemoRole, field: "email" | "password", value: string) => {
    setDemos((prev) => prev.map((d) => d.key === key ? { ...d, [field]: value } : d))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, "settings", "demoAccounts"), { accounts: demos, showDemo })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true)
    const next = !showDemo
    try {
      await setDoc(doc(db, "settings", "demoAccounts"), { accounts: demos, showDemo: next })
      setShowDemo(next)
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingVisibility(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <KeyRound className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Demo Credentials</h2>
              <p className="text-sm text-gray-500">Update demo account details shown on the login page.</p>
            </div>
          </div>
          {/* Show / Hide toggle */}
          {!loading && (
            <button
              onClick={handleToggleVisibility}
              disabled={togglingVisibility}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                showDemo
                  ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {togglingVisibility ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showDemo ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {showDemo ? "Visible on Login" : "Hidden on Login"}
            </button>
          )}
        </div>
        {!loading && (
          <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${showDemo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {showDemo
              ? "✓ Demo account buttons are currently shown on the login page."
              : "✗ Demo account buttons are currently hidden from the login page."}
          </div>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          demos.map((demo) => (
            <div key={demo.key} className="px-6 py-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">{demo.label}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
                  <input
                    type="email"
                    value={demo.email}
                    onChange={(e) => handleChange(demo.key, "email", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Password</label>
                  <input
                    type="text"
                    value={demo.password}
                    onChange={(e) => handleChange(demo.key, "password", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {!loading && (
        <div className="border-t border-gray-100 px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved successfully
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Admin Stat Cards ──────────────────────────────────────────────────────────

function AdminStatCards() {
  const [counts, setCounts] = useState({ donors: 0, orgs: 0, vendors: 0, loaded: false })

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, "users"), where("role", "==", "donor"))),
      getDocs(query(collection(db, "users"), where("role", "==", "organization"))),
      getAllVendorsForAdmin(),
    ]).then(([donorSnap, orgSnap, vendors]) => {
      setCounts({ donors: donorSnap.size, orgs: orgSnap.size, vendors: vendors.length, loaded: true })
    }).catch(console.error)
  }, [])

  const cards = [
    { icon: Users,    label: "Donors",        value: counts.loaded ? String(counts.donors)  : "…", color: "text-blue-700",   bg: "bg-blue-50"   },
    { icon: Building2, label: "Organizations", value: counts.loaded ? String(counts.orgs)    : "…", color: "text-green-700",  bg: "bg-green-50"  },
    { icon: Store,    label: "Vendors",        value: counts.loaded ? String(counts.vendors) : "…", color: "text-orange-700", bg: "bg-orange-50" },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
            <Icon className="h-5 w-5" />
          </span>
          <p className={`mt-3 text-xl font-bold ${color}`}>{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      ))}
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, userDoc, loading } = useAuth()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!loading && (!user || userDoc?.role !== "admin")) {
      router.replace("/login")
    }
  }, [loading, user, userDoc, router])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutUser()
      document.cookie = "user_role=;path=/;max-age=0"
      router.replace("/login")
    } catch (e) {
      console.error(e)
      setLoggingOut(false)
    }
  }

  if (loading || !userDoc) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (userDoc.role !== "admin") return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-500">{userDoc.email}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 p-6 lg:p-8">

        {/* Quick stat cards */}
        <AdminStatCards />

        {/* Organization approvals */}
        <OrgApprovals />

        {/* Vendor approvals */}
        <VendorApprovals />

        {/* Invite manager */}
        <InviteManager />

        {/* Demo credentials manager */}
        <DemoCredentialsManager />

        {/* User management */}
        <UserManagement />

      </main>
    </div>
  )
}