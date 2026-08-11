'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCafeProfile } from '@/lib/cafe/actions'

export function OnboardingForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createCafeProfile(formData)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.redirect) router.push(result.redirect)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="field-label">
          Café Name <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Himalayan Brew"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="contact_name" className="field-label">
          Your Name <span className="text-red-600">*</span>
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          required
          placeholder="e.g. Ramesh Shrestha"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="phone" className="field-label">
          Phone Number <span className="text-red-600">*</span>
        </label>
        <div className="flex">
          <span className="inline-flex select-none items-center rounded-l-lg border border-r-0 border-cream-300 bg-cream-100 px-3.5 font-display text-sm tracking-[0.08em] text-gray-500">
            +977
          </span>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="98XXXXXXXX"
            className="field flex-1 rounded-l-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="neighborhood" className="field-label">
          Neighborhood <span className="text-red-600">*</span>
        </label>
        <input
          id="neighborhood"
          name="neighborhood"
          type="text"
          required
          placeholder="e.g. Thamel, Patan, Baneshwor"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="delivery_address" className="field-label">
          Delivery Address <span className="text-red-600">*</span>
        </label>
        <textarea
          id="delivery_address"
          name="delivery_address"
          required
          rows={3}
          placeholder="Full address where supplies should be delivered…"
          className="field resize-none"
        />
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary btn-block btn-lg"
      >
        {isPending ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  )
}
