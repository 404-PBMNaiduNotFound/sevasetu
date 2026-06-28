"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/org/sidebar"

export default function OrgLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isRegisterRoute = pathname?.startsWith("/org/register")

  if (isRegisterRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="lg:pl-64 pt-0 lg:pt-[57px]">{children}</main>
    </div>
  )
}