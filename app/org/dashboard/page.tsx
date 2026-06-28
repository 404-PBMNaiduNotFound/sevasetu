"use client"

import { useEffect, useState } from "react"
import { OrgDashboard } from "@/components/dashboard/org-dashboard"
import { useAuth } from "@/lib/auth-context"
import {
  getOrganization,
  getOrgDonations,
  getOrgOrders,
  getMyRequirements,
  getMySlots,
  getUser,
  type OrganizationDoc,
  type DonationDoc,
  type OrderDoc,
  type RequirementDoc,
  type SlotDoc,
} from "@/lib/firestore"
import { Spinner } from "@/components/ui/spinner"

export default function OrgDashboardPage() {
  const { user, userDoc } = useAuth()
  const [org, setOrg] = useState<OrganizationDoc | null>(null)
  const [donations, setDonations] = useState<DonationDoc[]>([])
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [requirements, setRequirements] = useState<RequirementDoc[]>([])
  const [slots, setSlots] = useState<SlotDoc[]>([])
  const [donorNames, setDonorNames] = useState<Record<string, { name: string; email: string }>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      const uid = user!.uid

      try {
        const [orgData, donationsData, reqsData, slotsData, ordersData] = await Promise.all([
          getOrganization(uid),
          getOrgDonations(uid),
          getMyRequirements(uid),
          getMySlots(uid),
          getOrgOrders(uid),
        ])

        if (cancelled) return

        setOrg(orgData)
        setDonations(donationsData)
        setRequirements(reqsData)
        setSlots(slotsData)
        setOrders(ordersData)

        const uniqueDonorIds = [...new Set(donationsData.map((d) => d.donorId))]
        const donorEntries = await Promise.all(
          uniqueDonorIds.map(async (id) => {
            const donor = await getUser(id)
            return [id, { name: donor?.name ?? "Unknown Donor", email: donor?.email ?? "" }] as const
          })
        )

        if (cancelled) return

        setDonorNames(Object.fromEntries(donorEntries))
        setLastUpdated(new Date())
      } catch (error) {
        console.error("Dashboard load failed:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="size-8" />
      </div>
    )
  }

  const orgName = org?.organizationName || org?.name || userDoc?.name || "there"

  return (
    <OrgDashboard
      org={org}
      userName={orgName}
      donations={donations}
      orders={orders}
      requirements={requirements}
      donorNames={donorNames}
      lastUpdated={lastUpdated}
      slots={slots}
    />
  )
}