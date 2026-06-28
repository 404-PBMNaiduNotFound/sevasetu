"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createOrder, markOrderFailed, getOrganization, getVendor, VendorItemDoc, VendorDoc } from "@/lib/firestore"
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Building2, Phone, Mail, PackageX } from "lucide-react"
import { AddressMapPin } from "@/components/map/AddressMapPin"

interface FindVendorStepBProps {
  donation: any
  selectedItem: VendorItemDoc
  onBack: () => void
}

type PaymentStatus = "idle" | "processing" | "success" | "error"

export function FindVendorStepB({
  donation,
  selectedItem,
  onBack,
}: FindVendorStepBProps) {
  const { user, userDoc } = useAuth()
  const { initiateCheckout, loading: checkoutLoading } = useRazorpayCheckout()
  const [status, setStatus] = useState<PaymentStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [orderRecordId, setOrderRecordId] = useState("")

  // Org delivery details — fetched from Firestore, not entered by donor
  const [orgName, setOrgName] = useState(donation.organizationName || "")
  const [orgPhone, setOrgPhone] = useState("")
  const [orgAddress, setOrgAddress] = useState("")
  const [orgCity, setOrgCity] = useState("")
  const [orgState, setOrgState] = useState("")
  const [orgLat, setOrgLat] = useState<number | undefined>(undefined)
  const [orgLng, setOrgLng] = useState<number | undefined>(undefined)
  const [loadingOrg, setLoadingOrg] = useState(true)

  // Vendor contact details — fetched to show when stock is insufficient
  const [vendor, setVendor] = useState<VendorDoc | null>(null)
  const [loadingVendor, setLoadingVendor] = useState(true)

  useEffect(() => {
    async function fetchVendor() {
      if (!selectedItem.vendorId) { setLoadingVendor(false); return }
      try {
        const v = await getVendor(selectedItem.vendorId)
        setVendor(v)
      } catch (e) {
        console.error("Failed to fetch vendor details:", e)
      } finally {
        setLoadingVendor(false)
      }
    }
    fetchVendor()
  }, [selectedItem.vendorId])

  useEffect(() => {
    async function fetchOrg() {
      if (!donation.organizationId) {
        setLoadingOrg(false)
        return
      }
      try {
        const org = await getOrganization(donation.organizationId)
        if (org) {
          setOrgName(org.organizationName || donation.organizationName || "")
          setOrgPhone(org.phone || "")
          setOrgAddress(org.address || "")
          setOrgCity(org.city || "")
          setOrgState(org.state || "")
          setOrgLat(org.lat)
          setOrgLng(org.lng)
        }
      } catch (e) {
        console.error("Failed to fetch org details:", e)
      } finally {
        setLoadingOrg(false)
      }
    }
    fetchOrg()
  }, [donation.organizationId, donation.organizationName])

  // Meal sponsorships store the count in `meals`; item donations use `quantity`
  const qty = donation.quantity ?? donation.meals ?? 1
  const totalAmount = qty * selectedItem.pricePerUnit

  // Stock check — only applies when vendor has set an availableQuantity cap
  const isMealDonation = !donation.requirementId && (donation.itemName === "meals" || donation.meals != null)
  const stockLabel = isMealDonation ? "meals" : (selectedItem.unit || "items")
  const hasStockCap = selectedItem.availableQuantity !== undefined && selectedItem.availableQuantity !== null
  const isInsufficientStock = hasStockCap && (selectedItem.availableQuantity! < qty)

  const handleConfirmAndPay = async () => {
    if (!orgAddress) {
      setErrorMessage("Organisation address could not be loaded. Please try again.")
      return
    }
    if (!user || !userDoc) return

    setStatus("processing")
    setErrorMessage("")

    try {
      const newOrderId = await createOrder({
        vendorId: selectedItem.vendorId,
        vendorName: selectedItem.vendorName,
        organizationId: donation.organizationId,
        organizationName: orgName,
        donorId: user.uid,
        donorName: userDoc.name,
        donationId: donation.id,
        requirementId: donation.requirementId,
        vendorItemId: selectedItem.id,
        orderId: `ORD-${Date.now()}`,
        amount: totalAmount,
        items: [
          {
            name: selectedItem.itemName,
            quantity: qty,
            price: selectedItem.pricePerUnit,
          },
        ],
        status: "payment_confirmed",
        receiverName: orgName,
        receiverPhone: orgPhone,
        receiverAddress: orgAddress,
      })

      setOrderRecordId(newOrderId)

      initiateCheckout({
        amount: totalAmount,
        orderId: newOrderId,
        donorId: user.uid,
        donorName: userDoc.name,
        donorEmail: user.email || "",
        donorPhone: userDoc.phone || orgPhone,
        requirementId: donation.requirementId,
        organizationId: donation.organizationId,
        donationId: donation.id,
        onSuccess: () => {
          setStatus("success")
        },
        onError: async (error: any) => {
          // Mark the pre-created order as failed so it doesn't appear
          // as a live/paid order to the vendor or org, and so it's
          // excluded from the donor's transaction history (which already
          // hides status === "failed"). Awaited (not fire-and-forget) so
          // we know definitively whether the order was actually marked
          // failed before deciding what to tell the donor.
          let markedFailed = true
          if (newOrderId) {
            try {
              await markOrderFailed(newOrderId)
            } catch (markError) {
              console.error("Failed to mark order as failed:", markError)
              markedFailed = false
            }
          }

          const baseMessage = error instanceof Error ? error.message : "Payment was cancelled"
          setErrorMessage(
            markedFailed
              ? baseMessage
              : `${baseMessage} (could not clean up the pending order — please contact support so you are not charged)`
          )
          setStatus("error")
        },
      })
    } catch (error) {
      console.error("Order creation failed:", error)
      setErrorMessage(error instanceof Error ? error.message : "Could not create the order")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="w-16 h-16 mx-auto text-success-green mb-4" />
        <h2 className="text-2xl font-bold text-navy-primary mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-6">
          Your order has been confirmed and payment received.
        </p>
        <div className="bg-green-50 border border-success-green/20 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-navy-primary mb-2">
            <span className="font-semibold">Order ID:</span> {orderRecordId}
          </p>
          <p className="text-sm text-navy-primary mb-2">
            <span className="font-semibold">Total Amount:</span> ₹{totalAmount.toFixed(2)}
          </p>
          <p className="text-sm text-navy-primary mb-2">
            <span className="font-semibold">Delivering to:</span> {orgName}
          </p>
          <p className="text-sm text-navy-primary">
            <span className="font-semibold">Status:</span> Payment Confirmed
          </p>
        </div>
        <Button onClick={() => (window.location.href = "/donor/transactions")} className="gap-2">
          View My Transactions
        </Button>
      </Card>
    )
  }

  const isBusy = status === "processing" || checkoutLoading

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isBusy}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-success-green text-white flex items-center justify-center text-xs font-semibold">
            1
          </div>
          <span className="text-sm text-navy-primary font-medium">Search</span>
          <div className="flex-1 h-1 bg-border mx-2"></div>
          <div className="w-6 h-6 rounded-full bg-vendor-orange text-white flex items-center justify-center text-xs font-semibold">
            2
          </div>
          <span className="text-sm text-navy-primary font-medium">Confirm & Pay</span>
        </div>
      </div>

      {/* Order Summary */}
      <Card className="p-6 bg-blue-50 border-action-blue/20">
        <h3 className="font-semibold text-navy-primary mb-4">Order Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item:</span>
            <span className="font-medium">{selectedItem.itemName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vendor:</span>
            <span className="font-medium">{selectedItem.vendorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Quantity:</span>
            <span className="font-medium">
              {qty} {selectedItem.unit}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Price per Unit:</span>
            <span className="font-medium">₹{selectedItem.pricePerUnit}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-semibold text-navy-primary">Total Amount:</span>
            <span className="font-bold text-success-green text-lg">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Delivery Address — auto-filled from org, read-only */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-action-blue" />
          <h3 className="font-semibold text-navy-primary">Delivery Details</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Goods will be delivered directly to the organisation. Details are auto-filled from their profile.
        </p>

        {loadingOrg ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading organisation details…
          </div>
        ) : (
          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Organisation:</span>
              <span className="font-medium">{orgName || "—"}</span>
            </div>
            {orgPhone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{orgPhone}</span>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Delivery Address</p>
              <AddressMapPin
                address={orgAddress}
                city={orgCity}
                state={orgState}
                savedLat={orgLat}
                savedLng={orgLng}
                label={orgName}
                type="org"
                height="180px"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Insufficient Stock Warning */}
      {isInsufficientStock && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="flex gap-3">
            <PackageX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">
                Insufficient {isMealDonation ? "Meals" : "Items"}
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                This vendor only has{" "}
                <span className="font-bold">{selectedItem.availableQuantity} {stockLabel}</span>{" "}
                available, but your donation requires{" "}
                <span className="font-bold">{qty} {stockLabel}</span>.
                Please go back and choose a different vendor, or contact this vendor directly to arrange the shortfall.
              </p>
            </div>
          </div>

          {/* Vendor contact details */}
          {loadingVendor ? (
            <div className="flex items-center gap-2 text-sm text-red-600 pl-8">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading vendor contact…
            </div>
          ) : vendor && (
            <div className="ml-8 rounded-lg border border-red-200 bg-white p-3 space-y-1.5 text-sm">
              <p className="font-semibold text-gray-900">{vendor.businessName}</p>
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-2 text-red-700 hover:text-red-900 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-2 text-red-700 hover:text-red-900 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {vendor.email}
                </a>
              )}
              {vendor.address && (
                <p className="text-gray-500 text-xs">
                  {[vendor.address, vendor.city, vendor.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {status === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Payment Error</p>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isBusy}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmAndPay}
          disabled={isBusy || loadingOrg || isInsufficientStock}
          className="flex-1 gap-2 bg-vendor-orange hover:bg-vendor-orange/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
          {isBusy ? "Processing..." : "Confirm & Pay"}
        </Button>
      </div>
    </div>
  )
}