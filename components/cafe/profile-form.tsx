'use client'

import { useState, useTransition } from 'react'
import { updateCafeProfile } from '@/lib/cafe/actions'
import type { Cafe } from '@/lib/types'

const fieldClass =
  'block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

interface EditableFields {
  name: string
  contact_name: string
  neighborhood: string
  delivery_address: string
}

function toFields(cafe: Cafe): EditableFields {
  return {
    name: cafe.name,
    contact_name: cafe.contact_name,
    neighborhood: cafe.neighborhood,
    delivery_address: cafe.delivery_address,
  }
}

export function ProfileForm({ cafe }: { cafe: Cafe }) {
  const [baseline, setBaseline] = useState<EditableFields>(() => toFields(cafe))
  const [values, setValues] = useState<EditableFields>(() => toFields(cafe))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isDirty =
    values.name !== baseline.name ||
    values.contact_name !== baseline.contact_name ||
    values.neighborhood !== baseline.neighborhood ||
    values.delivery_address !== baseline.delivery_address

  function updateField(field: keyof EditableFields, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isDirty) return
    setError('')
    setSaved(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateCafeProfile(formData)
      if (result.error) {
        setError(result.error)
        return
      }
      setBaseline(values)
      setSaved(true)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5"
    >
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Café Info</h2>

      <div>
        <label htmlFor="name" className={labelClass}>
          Café Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={values.name}
          onChange={e => updateField('name', e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="contact_name" className={labelClass}>
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          required
          value={values.contact_name}
          onChange={e => updateField('contact_name', e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="neighborhood" className={labelClass}>
          Neighborhood <span className="text-red-500">*</span>
        </label>
        <input
          id="neighborhood"
          name="neighborhood"
          type="text"
          required
          value={values.neighborhood}
          onChange={e => updateField('neighborhood', e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="delivery_address" className={labelClass}>
          Delivery Address <span className="text-red-500">*</span>
        </label>
        <textarea
          id="delivery_address"
          name="delivery_address"
          required
          rows={3}
          value={values.delivery_address}
          onChange={e => updateField('delivery_address', e.target.value)}
          className={`${fieldClass} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-sm text-emerald-600">Saved!</p>}

      <button
        type="submit"
        disabled={isPending || !isDirty}
        className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
