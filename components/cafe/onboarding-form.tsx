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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Café Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Himalayan Brew"
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          required
          placeholder="e.g. Ramesh Shrestha"
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">
          Neighborhood <span className="text-red-500">*</span>
        </label>
        <input
          id="neighborhood"
          name="neighborhood"
          type="text"
          required
          placeholder="e.g. Thamel, Patan, Baneshwor"
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="delivery_address" className="block text-sm font-medium text-gray-700 mb-1">
          Delivery Address <span className="text-red-500">*</span>
        </label>
        <textarea
          id="delivery_address"
          name="delivery_address"
          required
          rows={3}
          placeholder="Full address where supplies should be delivered…"
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  )
}
