"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getOrganization, type OrganizationDoc } from "@/lib/firestore"
import { OrgDetails } from "@/components/donor/org-details"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function OrgDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [org, setOrg] = useState<OrganizationDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    getOrganization(id)
      .then(setOrg)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="py-12 text-center">
        <p className="font-semibold text-foreground">Organization not found</p>
      </div>
    )
  }

  const ownItemsHref = `/donor/own-items?orgId=${encodeURIComponent(org.uid)}&orgName=${encodeURIComponent(org.organizationName ?? org.name ?? "")}`

  return (  
    <>
      <OrgDetails org={org} />
      <div className="mt-6 flex justify-center">
        <Link href={ownItemsHref} className="inline-block">
  
        </Link>
      </div>
    </>
  );
}
