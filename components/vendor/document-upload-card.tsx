'use client'

import { useState } from 'react'
import { Upload, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusPill } from './status-pill'

export interface DocumentUpload {
  name: string
  type: 'business_license' | 'tax_certificate' | 'bank_statement' | 'identity'
  file?: File
  status?: 'pending' | 'approved' | 'rejected'
}

interface DocumentUploadCardProps {
  document: DocumentUpload
  onFileChange: (file: File) => void
  onRemove: () => void
  isLoading?: boolean
}

export function DocumentUploadCard({
  document,
  onFileChange,
  onRemove,
  isLoading = false,
}: DocumentUploadCardProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0])
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-foreground">{document.name}</h4>
          <p className="mt-1 text-sm text-muted-foreground">Required for verification</p>
        </div>
        {document.status && <StatusPill status={document.status} size="sm" />}
      </div>

      {document.file ? (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{document.file.name}</span>
          </div>
          <button
            onClick={onRemove}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50'
          }`}
        >
          <Upload
            className={`mx-auto mb-2 h-8 w-8 ${
              isDragActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          />
          <p className="mb-1 text-sm font-medium text-foreground">
            Drag and drop your file here
          </p>
          <p className="mb-3 text-xs text-muted-foreground">or</p>
          <label className="cursor-pointer">
            <input
              type="file"
              onChange={handleChange}
              disabled={isLoading}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <Button variant="outline" size="sm" asChild disabled={isLoading}>
              <span>Select File</span>
            </Button>
          </label>
          <p className="mt-3 text-xs text-muted-foreground">PDF, JPG, or PNG up to 10MB</p>
        </div>
      )}
    </div>
  )
}
