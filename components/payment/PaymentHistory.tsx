'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { getDonorPayments, type PaymentDoc } from '@/lib/firestore'
import { formatFirestoreDate } from '@/lib/utils'

interface PaymentHistoryProps {
  donorId: string
}

export function PaymentHistory({ donorId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!donorId) {
      setLoading(false)
      return
    }

    const fetchPayments = async () => {
      try {
        setLoading(true)
        // Scoped to the current donor only — matches firestore.rules,
        // which denies reads on /payments docs that aren't yours.
        const paymentsData = await getDonorPayments(donorId)
        setPayments(paymentsData)
      } catch (err) {
        console.error('[PaymentHistory] fetch error:', err)
        setError('Failed to load payment history')
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [donorId])

  const getStatusIcon = (status: PaymentDoc['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />
      case 'failed':
        return <AlertCircle size={18} className="text-red-500" />
      default:
        return <Clock size={18} className="text-yellow-500" />
    }
  }

  const getStatusBadge = (status: PaymentDoc['status']) => {
    const baseClass = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'success':
        return `${baseClass} bg-green-100 text-green-700`
      case 'failed':
        return `${baseClass} bg-red-100 text-red-700`
      default:
        return `${baseClass} bg-yellow-100 text-yellow-700`
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"></div>
          <p className="mt-2 text-sm text-gray-600">Loading payments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <p className="text-center text-red-600">{error}</p>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <div className="text-center">
          <p className="text-gray-600">No payments found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Donor Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {payment.donorName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {payment.donorEmail}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  ₹{payment.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={getStatusBadge(payment.status)}>
                    {getStatusIcon(payment.status)}
                    {payment.status.charAt(0).toUpperCase() +
                      payment.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatFirestoreDate(payment.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
