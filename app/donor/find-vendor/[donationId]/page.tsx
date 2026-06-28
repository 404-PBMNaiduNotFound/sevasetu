"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDonation, VendorItemDoc } from "@/lib/firestore"
import { useParams } from "next/navigation"
import { FindVendorStepA } from "@/components/vendor/find-vendor-step-a"
import { FindVendorStepB } from "@/components/vendor/find-vendor-step-b"
import { Loader2 } from "lucide-react"

type Step = "search" | "confirm"

export default function FindVendorPage() {
  const { user, userDoc } = useAuth()
  const params = useParams()
  const donationId = params.donationId as string

  const [step, setStep] = useState<Step>("search")
  const [loading, setLoading] = useState(true)
  const [donation, setDonation] = useState<any>(null)
  const [selectedItem, setSelectedItem] = useState<VendorItemDoc | null>(null)

  useEffect(() => {
    const loadDonation = async () => {
      if (!donationId) return
      try {
        const data = await getDonation(donationId)
        setDonation(data)
      } catch (error) {
        console.error("Failed to load donation:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDonation()
  }, [donationId])

  const handleItemSelected = (item: VendorItemDoc) => {
    setSelectedItem(item)
    setStep("confirm")
  }

  const handleBackToSearch = () => {
    setStep("search")
    setSelectedItem(null)
  }

  if (!user || userDoc?.role !== "donor") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Donor role required.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-action-blue" />
      </div>
    )
  }

  if (!donation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Donation not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-primary mb-2">
            Find a Vendor & Pay
          </h1>
          <p className="text-muted-foreground">
            Complete your donation by selecting a vendor and confirming payment
          </p>
        </div>

        {step === "search" && (
          <FindVendorStepA
            donation={donation}
            onItemSelected={handleItemSelected}
          />
        )}

        {step === "confirm" && selectedItem && (
          <FindVendorStepB
            donation={donation}
            selectedItem={selectedItem}
            onBack={handleBackToSearch}
          />
        )}
      </div>
    </div>
  )
}
