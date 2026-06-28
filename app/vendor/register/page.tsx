'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { StepBadge } from '@/components/vendor/step-badge'
import { DocumentUploadCard } from '@/components/vendor/document-upload-card'
import { registerUser } from '@/lib/auth'
import { upsertVendor, uploadVendorDocument } from '@/lib/firestore'
import type { DocumentUpload } from '@/components/vendor/document-upload-card'

const step1Schema = z.object({
  businessName: z.string().min(3, 'Business name is required'),
  ownerName: z.string().min(3, 'Owner name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Valid phone number required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5,6}$/, 'Valid zip code required'),
})

const step2Schema = z.object({
  businessLicense: z.string().min(1, 'Business license is required'),
  taxId: z.string().min(1, 'Tax ID is required'),
})

const step3Schema = z.object({
  bankAccountHolder: z.string().min(3, 'Account holder name is required'),
  bankAccountNumber: z.string().regex(/^\d{9,18}$/, 'Valid account number required'),
  bankName: z.string().min(3, 'Bank name is required'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

export default function VendorRegistration() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Record<string, DocumentUpload>>({
    businessLicense: { name: 'Business License', type: 'business_license' },
    taxCertificate: { name: 'Tax Certificate', type: 'tax_certificate' },
  })

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
  })

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onChange',
  })

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    mode: 'onChange',
  })

  const handleStep1Continue = async (data: Step1Data) => {
    setStep(2)
  }

  const handleStep2Continue = (data: Step2Data) => {
    setStep(3)
  }

  const handleSubmit = async (data: Step3Data) => {
    if (!documents.businessLicense.file || !documents.taxCertificate.file) {
      alert('Please upload all required documents')
      return
    }

    setIsLoading(true)
    try {
      const step1Data = step1Form.getValues()
      const step2Data = step2Form.getValues()

      // Create the Firebase Auth account + users/{uid} + vendors/{uid} doc
      // (registerUser's "vendor" branch — see lib/auth.ts)
      const user = await registerUser(
        step1Data.email,
        step1Data.password,
        'vendor',
        step1Data.businessName
      )
      const vendorId = user.uid

      // Fill in the rest of the vendor profile beyond what registerUser seeds
      await upsertVendor(vendorId, {
        businessName: step1Data.businessName,
        ownerName: step1Data.ownerName,
        email: step1Data.email,
        phone: step1Data.phone,
        address: step1Data.address,
        city: step1Data.city,
        state: step1Data.state,
        zipCode: step1Data.zipCode,
        businessLicense: step2Data.businessLicense,
        taxId: step2Data.taxId,
        bankAccountHolder: data.bankAccountHolder,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        approvalStatus: 'pending',
      })

      // Convert documents to base64 and store directly in Firestore.
      // This avoids Firebase Storage (which requires a paid Blaze plan).
      // Files are stored as base64 data URLs in the vendorDocuments collection.
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })

      if (documents.businessLicense.file) {
        const fileUrl = await toBase64(documents.businessLicense.file)
        await uploadVendorDocument(vendorId, {
          vendorId,
          documentType: 'business_license',
          fileUrl,
          fileName: documents.businessLicense.file.name,
          status: 'pending',
        })
      }

      if (documents.taxCertificate.file) {
        const fileUrl = await toBase64(documents.taxCertificate.file)
        await uploadVendorDocument(vendorId, {
          vendorId,
          documentType: 'tax_certificate',
          fileUrl,
          fileName: documents.taxCertificate.file.name,
          status: 'pending',
        })
      }

      // Set the role cookie so middleware allows access to /vendor routes,
      // same pattern used by the login form (lib/auth.ts / components/auth/login-form.tsx)
      document.cookie = 'user_role=vendor;path=/;SameSite=Strict'

      router.push('/vendor/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-neutral-900" style={{ color: 'var(--navy-primary)' }}>
            Vendor Registration
          </h1>
          <p className="text-neutral-600 mt-2">Join SevaSetu as a vendor partner</p>
        </div>

        {/* Step indicators */}
        <div className="mb-12 flex justify-between items-start">
          <StepBadge number={1} isActive={step === 1} isCompleted={step > 1} label="Business Info" />
          <div className="flex-1 border-t-2 border-neutral-200 mx-4 mt-6" />
          <StepBadge number={2} isActive={step === 2} isCompleted={step > 2} label="Documents" />
          <div className="flex-1 border-t-2 border-neutral-200 mx-4 mt-6" />
          <StepBadge number={3} isActive={step === 3} isCompleted={step > 3} label="Bank Details" />
        </div>

        {/* Step 1: Business Information */}
        {step === 1 && (
          <form onSubmit={step1Form.handleSubmit(handleStep1Continue)}>
            <Card className="p-8">
              <h2 className="text-xl font-bold text-neutral-900 mb-6">Business Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Business Name *
                  </label>
                  <Input
                    {...step1Form.register('businessName')}
                    placeholder="Enter business name"
                    className="w-full"
                  />
                  {step1Form.formState.errors.businessName && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.businessName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Owner Name *
                  </label>
                  <Input
                    {...step1Form.register('ownerName')}
                    placeholder="Enter owner name"
                    className="w-full"
                  />
                  {step1Form.formState.errors.ownerName && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.ownerName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email *
                  </label>
                  <Input
                    {...step1Form.register('email')}
                    type="email"
                    placeholder="Enter email address"
                    className="w-full"
                  />
                  {step1Form.formState.errors.email && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Password *
                  </label>
                  <Input
                    {...step1Form.register('password')}
                    type="password"
                    placeholder="At least 6 characters"
                    className="w-full"
                  />
                  {step1Form.formState.errors.password && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone *
                  </label>
                  <Input
                    {...step1Form.register('phone')}
                    placeholder="10-digit phone number"
                    className="w-full"
                  />
                  {step1Form.formState.errors.phone && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Address *
                  </label>
                  <Input
                    {...step1Form.register('address')}
                    placeholder="Enter street address"
                    className="w-full"
                  />
                  {step1Form.formState.errors.address && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    City *
                  </label>
                  <Input
                    {...step1Form.register('city')}
                    placeholder="Enter city"
                    className="w-full"
                  />
                  {step1Form.formState.errors.city && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    State *
                  </label>
                  <Input
                    {...step1Form.register('state')}
                    placeholder="Enter state"
                    className="w-full"
                  />
                  {step1Form.formState.errors.state && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.state.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Zip Code *
                  </label>
                  <Input
                    {...step1Form.register('zipCode')}
                    placeholder="Enter zip code"
                    className="w-full"
                  />
                  {step1Form.formState.errors.zipCode && (
                    <p className="text-red-600 text-sm mt-1">
                      {step1Form.formState.errors.zipCode.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!step1Form.formState.isValid || isLoading}
                  className="flex items-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </form>
        )}

        {/* Step 2: Documents */}
        {step === 2 && (
          <form onSubmit={step2Form.handleSubmit(handleStep2Continue)}>
            <Card className="p-8">
              <h2 className="text-xl font-bold text-neutral-900 mb-6">Upload Documents</h2>

              <div className="space-y-6 mb-8">
                <DocumentUploadCard
                  document={documents.businessLicense}
                  onFileChange={(file) => {
                    setDocuments({
                      ...documents,
                      businessLicense: { ...documents.businessLicense, file },
                    })
                    step2Form.setValue('businessLicense', file.name, { shouldValidate: true })
                  }}
                  onRemove={() => {
                    setDocuments({
                      ...documents,
                      businessLicense: { ...documents.businessLicense, file: undefined },
                    })
                    step2Form.setValue('businessLicense', '', { shouldValidate: true })
                  }}
                  isLoading={isLoading}
                />

                <DocumentUploadCard
                  document={documents.taxCertificate}
                  onFileChange={(file) => {
                    setDocuments({
                      ...documents,
                      taxCertificate: { ...documents.taxCertificate, file },
                    })
                    step2Form.setValue('taxId', file.name, { shouldValidate: true })
                  }}
                  onRemove={() => {
                    setDocuments({
                      ...documents,
                      taxCertificate: { ...documents.taxCertificate, file: undefined },
                    })
                    step2Form.setValue('taxId', '', { shouldValidate: true })
                  }}
                  isLoading={isLoading}
                />
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !step2Form.formState.isValid ||
                    !documents.businessLicense.file ||
                    !documents.taxCertificate.file ||
                    isLoading
                  }
                  className="flex items-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </form>
        )}

        {/* Step 3: Bank Details */}
        {step === 3 && (
          <form onSubmit={step3Form.handleSubmit(handleSubmit)}>
            <Card className="p-8">
              <h2 className="text-xl font-bold text-neutral-900 mb-6">Bank Details</h2>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Account Holder Name *
                  </label>
                  <Input
                    {...step3Form.register('bankAccountHolder')}
                    placeholder="Name on bank account"
                    className="w-full"
                  />
                  {step3Form.formState.errors.bankAccountHolder && (
                    <p className="text-red-600 text-sm mt-1">
                      {step3Form.formState.errors.bankAccountHolder.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Bank Account Number *
                  </label>
                  <Input
                    {...step3Form.register('bankAccountNumber')}
                    placeholder="9-18 digit account number"
                    className="w-full"
                  />
                  {step3Form.formState.errors.bankAccountNumber && (
                    <p className="text-red-600 text-sm mt-1">
                      {step3Form.formState.errors.bankAccountNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Bank Name *
                  </label>
                  <Input
                    {...step3Form.register('bankName')}
                    placeholder="Name of your bank"
                    className="w-full"
                  />
                  {step3Form.formState.errors.bankName && (
                    <p className="text-red-600 text-sm mt-1">
                      {step3Form.formState.errors.bankName.message}
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm text-blue-800">
                    Your bank details are encrypted and secured. They will only be used for payment settlements.
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={!step3Form.formState.isValid || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>
            </Card>
          </form>
        )}
      </div>
    </div>
  )
}