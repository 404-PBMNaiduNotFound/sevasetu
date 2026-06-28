'use client'

import { Heart } from 'lucide-react'

interface OrderSummaryProps {
  itemName: string
  quantity: number
  pricePerUnit: number
  totalAmount: number
}

export function OrderSummary({
  itemName,
  quantity,
  pricePerUnit,
  totalAmount,
}: OrderSummaryProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
          <Heart size={20} className="text-orange-500" fill="currentColor" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{itemName}</span>
          <span className="text-gray-900 font-medium">₹{pricePerUnit}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Quantity</span>
          <span className="text-gray-900 font-medium">{quantity}</span>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between">
            <span className="text-base font-semibold text-gray-900">
              Total Amount
            </span>
            <span className="text-xl font-bold text-[#0B1F3F]">
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
          Tax included in the amount above
        </div>
      </div>
    </div>
  )
}
