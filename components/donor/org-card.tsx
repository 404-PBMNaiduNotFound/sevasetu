"use client"

import Link from "next/link"
import { MapPin, BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OrganizationDoc } from "@/lib/firestore"

export function OrgCard({ org }: { org: OrganizationDoc }) {
  const displayName = org.organizationName ?? org.name ?? "Unnamed Organization"
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.address || ""
  const initial = displayName.charAt(0).toUpperCase()
  const cover = org.photoURLs?.[0]

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md w-full max-w-[380px] h-[500px] mx-auto">
      {/* Image / Avatar area */}
      <div className="relative h-56 w-full overflow-hidden bg-muted shrink-0">
        {cover ? (
          <img
            src={cover}
            alt={displayName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-6xl font-bold text-muted-foreground/30">
              {initial}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
          {org.category || "General"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold leading-snug text-foreground">{displayName}</h3>
          {org.verified && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>

        {location ? (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </p>
        ) : null}

        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {org.description || "Supporting communities through meaningful impact."}
        </p>

        <Button
          asChild
          className="mt-4 w-full rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Link href={`/donor/org/${org.uid ?? org.orgId}`}>
            View &amp; Sponsor
          </Link>
        </Button>
      </div>
    </article>
  )
}
