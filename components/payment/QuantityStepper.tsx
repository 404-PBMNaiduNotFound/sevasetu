'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value < max) onChange(value + 1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className="rounded p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        <Minus size={18} className="text-gray-600" />
      </button>

      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        className="w-12 text-center font-semibold text-gray-900 outline-none"
        aria-label="Quantity"
      />

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className="rounded p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        <Plus size={18} className="text-gray-600" />
      </button>
    </div>
  )
}
