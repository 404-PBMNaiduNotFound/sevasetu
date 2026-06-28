'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getVendor } from '@/lib/firestore'
import { VendorSidebar } from '@/components/vendor/sidebar'

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isRegisterPage = pathname === '/vendor/register'

  useEffect(() => {
    if (isRegisterPage) {
      setLoading(false)
      return
    }
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false)
        return
      }
      const vendor = await getVendor(user.uid)
      setApprovalStatus(vendor?.approvalStatus ?? 'pending')
      setLoading(false)
    })
    return () => unsub()
  }, [isRegisterPage])

  useEffect(() => {
    if (isRegisterPage || loading) return
    if (approvalStatus !== 'approved' && pathname !== '/vendor/dashboard' && pathname !== '/vendor/help') {
      router.replace('/vendor/dashboard')
    }
  }, [loading, approvalStatus, pathname, router, isRegisterPage])

  // Registration is a standalone full-page flow — no nav chrome at all
  if (isRegisterPage) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  const isApproved = approvalStatus === 'approved'

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorSidebar isApproved={isApproved} />
      <main className="lg:pl-64 pt-0 lg:pt-[57px]">
        {loading || isApproved || pathname === '/vendor/dashboard' || pathname === '/vendor/help' ? children : null}
      </main>
    </div>
  )
}
