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

  const fieldClass =
    'block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Product Name <span className="text-red-500">*</span>
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
            Category <span className="text-red-500">*</span>
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
            Unit <span className="text-red-500">*</span>
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
            Base Price (NPR) <span className="text-red-500">*</span>
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
            Stock Status <span className="text-red-500">*</span>
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
                className="w-20 h-20 rounded-lg object-cover border border-gray-200"
              />
              {isUploading && (
                <div className="absolute inset-0 rounded-lg bg-white/70 flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                </div>
              )}
              {!isUploading && (
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
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
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP · max 5 MB</p>
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending || isUploading}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Uploading image…' : isPending ? 'Saving…' : submitLabel}
        </button>
        <Link
          href="/admin/products"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
