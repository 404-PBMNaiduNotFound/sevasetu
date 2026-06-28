'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { QuantityStepper } from '@/components/payment/QuantityStepper'
import { OrderSummary } from '@/components/payment/OrderSummary'
import { PaymentForm, type FormData } from '@/components/payment/PaymentForm'
import { PaymentStatus } from '@/components/payment/PaymentStatus'
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout'
import { useAuth } from '@/lib/auth-context'
import {
  getRequirement,
  getOrganization,
  createDonation,
  type RequirementDoc,
  type OrganizationDoc,
} from '@/lib/firestore'
import { Spinner } from '@/components/ui/spinner'

export default function CheckoutPage() {
  const params = useParams<{ requirementId: string }>()
  const router = useRouter()
  const { user, userDoc } = useAuth()

  const [requirement, setRequirement] = useState<RequirementDoc | null>(null)
  const [organization, setOrganization] = useState<OrganizationDoc | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [quantity, setQuantity] = useState(1)
  const [paymentStatus, setPaymentStatus] = useState<
    'form' | 'pending' | 'success' | 'failed'
  >('form')
  const [paymentData, setPaymentData] = useState<any>(null)
  const { initiateCheckout, loading: checkoutLoading } = useRazorpayCheckout()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoadingData(true)
      try {
        const req = await getRequirement(params.requirementId)
        if (cancelled) return

        if (!req || !req.pricePerUnit) {
          setLoadError('This item is not available for direct purchase.')
          return
        }

        setRequirement(req)
        const org = await getOrganization(req.organizationId)
        if (cancelled) return
        setOrganization(org)
      } catch (err) {
        console.error('[checkout] load error:', err)
        if (!cancelled) setLoadError('Could not load this item. Please try again.')
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }

    if (params.requirementId) load()
    return () => {
      cancelled = true
    }
  }, [params.requirementId])

  const pricePerUnit = requirement?.pricePerUnit ?? 0
  const totalAmount = quantity * pricePerUnit
  const remaining = requirement
    ? requirement.totalQuantity - requirement.fulfilledQuantity
    : 0

  const handleFormSubmit = async (formData: FormData) => {
    if (!requirement || !user) return

    setPaymentStatus('pending')

    try {
      // Create the Pending donation first (workflow step 9: "Donor Selects
      // Quantity & Places Order"), then attach its id to the Razorpay order
      // so verify/route.ts can advance it to Approved on payment success.
      const donationId = await createDonation({
        donorId: user.uid,
        donorPhone: formData.donorPhone,
        organizationId: requirement.organizationId,
        requirementId: requirement.id,
        organizationName: organization?.organizationName || organization?.name || '',
        amount: totalAmount,
        quantity,
        itemName: requirement.title,
        unit: requirement.unit,
        status: "Pending",
      })

      const orderId = `ORDER-${Date.now()}`

      initiateCheckout({
        amount: totalAmount,
        orderId,
        donorId: user.uid,
        donorName: formData.donorName,
        donorEmail: formData.donorEmail,
        donorPhone: formData.donorPhone,
        requirementId: requirement.id,
        organizationId: requirement.organizationId,
        donationId,
        onSuccess: (response: any) => {
          setPaymentData({
            paymentId: response.paymentId,
            amount: totalAmount,
            donorName: formData.donorName,
          })
          setPaymentStatus('success')
        },
        onError: (error: any) => {
          console.error('[checkout] payment error:', error)
          setPaymentStatus('failed')
        },
      })
    } catch (error) {
      console.error('[checkout] donation creation error:', error)
      setPaymentStatus('failed')
    }
  }

  const handleReset = () => {
    setPaymentStatus('form')
    setPaymentData(null)
  }

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (loadError || !requirement) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <p className="text-gray-700 font-medium">{loadError ?? 'Item not found.'}</p>
        <Link href="/donor/browse" className="mt-4 text-blue-600 hover:underline text-sm">
          Back to browse
        </Link>
      </div>
    )
  }

  if (paymentStatus !== 'form') {
    return (
      <PaymentStatus
        status={paymentStatus === 'pending' ? 'pending' : paymentStatus === 'success' ? 'success' : 'failed'}
        paymentId={paymentData?.paymentId}
        amount={paymentData?.amount}
        donorName={paymentData?.donorName}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/donor/browse" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1">
            <span className="text-xs font-semibold text-blue-700">CHECKOUT</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{requirement.title}</h1>
          <p className="mt-2 text-gray-600">
            for {organization?.organizationName || organization?.name || 'this organization'}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Select Quantity
              </h2>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-gray-600">Price per {requirement.unit}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{pricePerUnit}</p>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-900">
                    Number of {requirement.unit} ({remaining} needed)
                  </label>
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={Math.max(remaining, 1)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Donor Information
              </h2>
              <PaymentForm
                onSubmit={handleFormSubmit}
                loading={checkoutLoading}
                defaultName={userDoc?.name}
                defaultEmail={userDoc?.email}
              />
            </div>
          </div>

          <div>
            <div className="sticky top-8">
              <OrderSummary
                itemName={requirement.title}
                quantity={quantity}
                pricePerUnit={pricePerUnit}
                totalAmount={totalAmount}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
