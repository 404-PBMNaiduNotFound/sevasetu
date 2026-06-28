'use client'

import { CheckCircle, AlertCircle, Loader } from 'lucide-react'
import Link from 'next/link'

interface PaymentStatusProps {
  status: 'pending' | 'success' | 'failed'
  paymentId?: string
  amount?: number
  donorName?: string
  onReset?: () => void
}

export function PaymentStatus({
  status,
  paymentId,
  amount,
  donorName,
  onReset,
}: PaymentStatusProps) {
  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 max-w-sm w-full text-center">
          <div className="mb-4 flex justify-center">
            <Loader size={48} className="animate-spin text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Processing Payment</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we process your payment
          </p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 max-w-sm w-full text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle
              size={48}
              className="text-green-500"
              fill="currentColor"
            />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Thank you {donorName}, your generous donation has been received.
          </p>

          <div className="mt-6 space-y-2 rounded-lg bg-gray-50 p-4 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment ID</span>
              <span className="font-mono font-medium text-gray-900">
                {paymentId}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount</span>
              <span className="font-semibold text-gray-900">
                ₹{amount?.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs text-gray-600">
              A confirmation email has been sent to your email address.
            </p>
            <Link
              href="/donor/payments/history"
              className="inline-block rounded-lg bg-[#2563EB] px-6 py-2 font-semibold text-white transition hover:bg-blue-600"
            >
              View Payment History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 max-w-sm w-full text-center">
        <div className="mb-4 flex justify-center">
          <AlertCircle size={48} className="text-red-500" fill="currentColor" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Payment Failed</h2>
        <p className="mt-2 text-sm text-gray-600">
          Unfortunately, your payment could not be processed. Please try again.
        </p>

        <div className="mt-6 space-y-2">
          <button
            onClick={onReset}
            className="w-full rounded-lg bg-[#2563EB] py-2 font-semibold text-white transition hover:bg-blue-600"
          >
            Try Again
          </button>
          <Link
            href="/donor/browse"
            className="block rounded-lg border border-gray-200 bg-white py-2 font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            Browse Other Items
          </Link>
        </div>
      </div>
    </div>
  )
}
