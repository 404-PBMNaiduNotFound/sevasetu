'use client'

import { useState } from 'react'

interface RazorpayCheckoutOptions {
  amount: number
  orderId: string
  donorId: string
  donorName: string
  donorEmail: string
  donorPhone: string
  /** Optional context linking this payment to a real requirement/org/donation
   *  in Firestore, so app/api/payments/verify can advance the right records. */
  requirementId?: string
  organizationId?: string
  donationId?: string
  onSuccess: (response: any) => void
  onError: (error: any) => void
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export const useRazorpayCheckout = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initiateCheckout = async (options: RazorpayCheckoutOptions) => {
    setLoading(true)
    setError(null)

    try {
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: options.amount,
          orderId: options.orderId,
          donorId: options.donorId,
          donorName: options.donorName,
          donorEmail: options.donorEmail,
          donorPhone: options.donorPhone,
          requirementId: options.requirementId,
          organizationId: options.organizationId,
          donationId: options.donationId,
        }),
      })

      if (!orderResponse.ok) {
        throw new Error('Failed to create order')
      }

      const orderData = await orderResponse.json()

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => {
        try {
          const razorpay = new window.Razorpay({
            key: orderData.key,
            order_id: orderData.orderId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'SevaSetu',
            description: 'Make a donation',
            customer_notification: 1,
            prefill: {
              name: options.donorName,
              email: options.donorEmail,
              contact: options.donorPhone,
            },
            handler: async (response: any) => {
              try {
                const verifyResponse = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: orderData.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                  }),
                })

                if (!verifyResponse.ok) {
                  throw new Error('Payment verification failed')
                }

                const verifyData = await verifyResponse.json()
                setLoading(false)
                options.onSuccess(verifyData)
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Verification failed'
                setError(errorMsg)
                setLoading(false)
                options.onError(err)
              }
            },
            modal: {
              ondismiss: () => {
                setLoading(false)
                setError('Payment cancelled')
                options.onError(null)
              },
            },
          })

          razorpay.on('payment.failed', (response: any) => {
            setLoading(false)
            setError('Payment failed')
            options.onError(response?.error ?? null)
          })

          razorpay.open()
        } catch (err) {
          // Razorpay checkout itself failed to open (bad config, blocked
          // script, etc.) — must still notify onError so the caller can
          // mark the pre-created order as failed instead of leaving it
          // stuck looking like a confirmed payment.
          const errorMsg = err instanceof Error ? err.message : 'Failed to open checkout'
          setError(errorMsg)
          setLoading(false)
          options.onError(err)
        }
      }
      script.onerror = () => {
        // Checkout script failed to load (network/blocked) — same
        // requirement as above: must reach onError so the caller can
        // mark the order as failed rather than leaving it dangling.
        setError('Failed to load payment gateway')
        setLoading(false)
        options.onError(new Error('Failed to load payment gateway'))
      }

      document.head.appendChild(script)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Checkout failed'
      setError(errorMsg)
      setLoading(false)
      options.onError(err)
    }
  }

  return { initiateCheckout, loading, error }
}