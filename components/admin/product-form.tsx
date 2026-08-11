'use client'

import { useActionState, useTransition, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createProductImageUploadUrl } from '@/lib/admin/actions'
import type { Product, StockStatus } from '@/lib/types'

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

const CATEGORIES = ['Coffee Beans', 'Sugar', 'Syrups', 'Chocolate', 'Other']
const UNITS = ['kg', 'pack', 'bottle', 'box', 'bag', 'sachet']

interface Props {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>
  product?: Product
  submitLabel: string
}

export function ProductForm({ action, product, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, {})
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null)
  const [cleared, setCleared] = useState(false)
  // Track upload state separately so the user doesn't wait on submit
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCleared(false)
    setUploadError(null)
    setUploadedUrl(null)
    setPreview(URL.createObjectURL(file))

    // Upload immediately in the background while the user fills the rest of the form
    setIsUploading(true)
    const result = await createProductImageUploadUrl(file.name)
    if ('error' in result) {
      setUploadError(result.error)
      setIsUploading(false)
      return
    }
    const uploadRes = await fetch(result.signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    setIsUploading(false)
    if (!uploadRes.ok) {
      setUploadError('Image upload failed. Please try again.')
      return
    }
    setUploadedUrl(result.publicUrl)
  }

  function handleClearImage() {
    setPreview(null)
    setCleared(true)
    setUploadError(null)
    setUploadedUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isUploading) return // wait for background upload to finish
    const formData = new FormData(e.currentTarget)
    formData.delete('image') // never send the raw file to the server action

    if (uploadedUrl) {
      formData.set('image_url', uploadedUrl)
    } else if (cleared) {
      formData.set('clear_image', '1')
    }

    startTransition(() => {
      formAction(formData)
    })
  }

  const fieldClass = 'field'
  const labelClass = 'field-label'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Product Name <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={product?.name ?? ''}
            placeholder="e.g. Ethiopian Yirgacheffe"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="category" className={labelClass}>
            Category <span className="text-red-600">*</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            required
            list="category-options"
            defaultValue={product?.category ?? ''}
            placeholder="e.g. Coffee Beans"
            className={fieldClass}
          />
          <datalist id="category-options">
            {CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <label htmlFor="unit" className={labelClass}>
            Unit <span className="text-red-600">*</span>
          </label>
          <input
            id="unit"
            name="unit"
            type="text"
            required
            list="unit-options"
            defaultValue={product?.unit ?? ''}
            placeholder="e.g. kg"
            className={fieldClass}
          />
          <datalist id="unit-options">
            {UNITS.map((u) => <option key={u} value={u} />)}
          </datalist>
        </div>

        <div>
          <label htmlFor="base_price" className={labelClass}>
            Base Price (NPR) <span className="text-red-600">*</span>
          </label>
          <input
            id="base_price"
            name="base_price"
            type="number"
            required
            min="0"
            step="0.01"
            defaultValue={product?.base_price ?? ''}
            placeholder="0.00"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="stock_status" className={labelClass}>
            Stock Status <span className="text-red-600">*</span>
          </label>
          <select
            id="stock_status"
            name="stock_status"
            defaultValue={product?.stock_status ?? 'in_stock'}
            className={fieldClass}
          >
            {STOCK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={product?.description ?? ''}
          placeholder="Optional notes about this product…"
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* Image upload — uploaded client-side, URL passed to server action */}
      <div>
        <label className={labelClass}>Product Image</label>
        <div className="flex items-start gap-4">
          {preview && (
            <div className="relative shrink-0">
              <Image
                src={preview}
                alt="Product preview"
                width={80}
                height={80}
                unoptimized
                className="arch-sm h-24 w-20 border border-cream-300 object-cover"
              />
              {isUploading && (
                <div className="arch-sm absolute inset-0 flex items-center justify-center bg-white/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              )}
              {!isUploading && (
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-900 text-xs text-cream-50 transition-colors hover:bg-red-600"
                  aria-label="Remove image"
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="block w-full cursor-pointer text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-brand-900 file:px-3.5 file:py-2 file:font-display file:text-sm file:uppercase file:tracking-[0.1em] file:text-cream-50 hover:file:bg-brand-950"
            />
            <p className="mt-2 text-xs text-gray-400">JPEG, PNG, WebP · max 5 MB</p>
          </div>
        </div>
        {uploadError && (
          <p role="alert" className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending || isUploading}
          className="btn btn-primary"
        >
          {isUploading ? 'Uploading image…' : isPending ? 'Saving…' : submitLabel}
        </button>
        <Link
          href="/admin/products"
          className="btn btn-outline"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
