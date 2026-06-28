'use client'

import { useState } from 'react'
import { Mail, Phone, User, Loader } from 'lucide-react'

interface PaymentFormProps {
  onSubmit: (formData: FormData) => void
  loading: boolean
  defaultName?: string
  defaultEmail?: string
}

export interface FormData {
  donorName: string
  donorEmail: string
  donorPhone: string
}

export function PaymentForm({ onSubmit, loading, defaultName, defaultEmail }: PaymentFormProps) {
  const [formData, setFormData] = useState<FormData>({
    donorName: defaultName ?? '',
    donorEmail: defaultEmail ?? '',
    donorPhone: '',
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.donorName.trim()) newErrors.donorName = 'Name is required'
    if (!formData.donorEmail.trim()) newErrors.donorEmail = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.donorEmail))
      newErrors.donorEmail = 'Invalid email'
    if (!formData.donorPhone.trim()) newErrors.donorPhone = 'Phone is required'
    else if (!/^\d{10}$/.test(formData.donorPhone.replace(/\D/g, '')))
      newErrors.donorPhone = 'Phone must be 10 digits'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            name="donorName"
            value={formData.donorName}
            onChange={handleChange}
            placeholder="Enter your full name"
            disabled={loading}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        {errors.donorName && (
          <p className="mt-1 text-xs text-red-600">{errors.donorName}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="email"
            name="donorEmail"
            value={formData.donorEmail}
            onChange={handleChange}
            placeholder="Enter your email"
            disabled={loading}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        {errors.donorEmail && (
          <p className="mt-1 text-xs text-red-600">{errors.donorEmail}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">
          Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="tel"
            name="donorPhone"
            value={formData.donorPhone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            disabled={loading}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        {errors.donorPhone && (
          <p className="mt-1 text-xs text-red-600">{errors.donorPhone}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#2563EB] py-2.5 font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <Loader size={18} className="animate-spin" />}
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </form>
  )
}
