import { Suspense } from "react"
import { SponsorForm } from "@/components/donor/sponsor-form"
import { Spinner } from "@/components/ui/spinner"

export default function SponsorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-8" /></div>}>
      <SponsorForm />
    </Suspense>
  )
}
