'use client'

import { useState, useTransition } from 'react'
import { updateCafeProfile } from '@/lib/cafe/actions'
import { EditButton } from '@/components/cafe/edit-button'
import { DisplayField } from '@/components/cafe/display-field'
import type { Cafe } from '@/lib/types'

const fieldClass = 'field'
const labelClass = 'field-label'

interface EditableFields {
  name: string
  contact_name: string
  phone: string
  neighborhood: string
  delivery_address: string
}

function toFields(cafe: Cafe): EditableFields {
  return {
    name: cafe.name,
    contact_name: cafe.contact_name,
    // Stored without the +977 prefix so it matches what the input displays —
    // keeping one representation avoids the field silently changing shape
    // the moment a user edits it.
    phone: cafe.phone.replace(/^\+977/, ''),
    neighborhood: cafe.neighborhood,
    delivery_address: cafe.delivery_address,
  }
}

export function ProfileForm({ cafe, email }: { cafe: Cafe; email: string }) {
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const [baseline, setBaseline] = useState<EditableFields>(() => toFields(cafe))
  const [values, setValues] = useState<EditableFields>(() => toFields(cafe))
  const [personalError, setPersonalError] = useState('')
  const [addressError, setAddressError] = useState('')
  const [personalSaved, setPersonalSaved] = useState(false)
  const [addressSaved, setAddressSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const personalDirty =
    values.name !== baseline.name ||
    values.contact_name !== baseline.contact_name ||
    values.phone !== baseline.phone

  const addressDirty =
    values.neighborhood !== baseline.neighborhood ||
    values.delivery_address !== baseline.delivery_address

  function updateField(field: keyof EditableFields, value: string) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  function startEditingPersonal() {
    setPersonalError('')
    setPersonalSaved(false)
    setEditingPersonal(true)
  }

  function startEditingAddress() {
    setAddressError('')
    setAddressSaved(false)
    setEditingAddress(true)
  }

  function cancelPersonal() {
    setValues(prev => ({ ...prev, name: baseline.name, contact_name: baseline.contact_name, phone: baseline.phone }))
    setPersonalError('')
    setEditingPersonal(false)
  }

  function cancelAddress() {
    setValues(prev => ({ ...prev, neighborhood: baseline.neighborhood, delivery_address: baseline.delivery_address }))
    setAddressError('')
    setEditingAddress(false)
  }

  function submitPersonal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!personalDirty) { setEditingPersonal(false); return }
    setPersonalError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateCafeProfile(formData)
      if (result.error) { setPersonalError(result.error); return }
      setBaseline(values)
      setPersonalSaved(true)
      setEditingPersonal(false)
    })
  }

  function submitAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!addressDirty) { setEditingAddress(false); return }
    setAddressError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateCafeProfile(formData)
      if (result.error) { setAddressError(result.error); return }
      setBaseline(values)
      setAddressSaved(true)
      setEditingAddress(false)
    })
  }

  return (
    <div className="space-y-5">
      {/* Personal Information card */}
      <div className="rounded-xl border border-cream-300 bg-white p-5">
        {!editingPersonal ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="display-sm text-brand-900">Personal Information</h2>
              <EditButton onClick={startEditingPersonal} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <DisplayField label="Café Name" value={values.name} />
              <DisplayField label="Contact Name" value={values.contact_name} />
              <DisplayField label="Email" value={email} />
              <DisplayField label="Phone" value={`+977 ${values.phone}`} />
            </div>
            {personalSaved && <p className="eyebrow-sm mt-4 text-olive-500">Saved</p>}
          </>
        ) : (
          <form onSubmit={submitPersonal} className="space-y-4">
            <h2 className="display-sm text-brand-900">Personal Information</h2>

            <div>
              <label htmlFor="name" className={labelClass}>
                Café Name <span className="text-red-600">*</span>
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
                Your Name <span className="text-red-600">*</span>
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
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="field cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone <span className="text-red-600">*</span>
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
                  value={values.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  className={`${fieldClass} rounded-l-none`}
                />
              </div>
            </div>

            {/* Address fields are edited in their own card — carried forward unchanged. */}
            <input type="hidden" name="neighborhood" value={values.neighborhood} />
            <input type="hidden" name="delivery_address" value={values.delivery_address} />

            {personalError && <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{personalError}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelPersonal}
                disabled={isPending}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !personalDirty}
                className="btn btn-primary flex-1"
              >
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Address card */}
      <div className="rounded-xl border border-cream-300 bg-white p-5">
        {!editingAddress ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="display-sm text-brand-900">Address</h2>
              <EditButton onClick={startEditingAddress} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <DisplayField label="Neighborhood" value={values.neighborhood} />
              <DisplayField label="Delivery Address" value={values.delivery_address} wide />
            </div>
            {addressSaved && <p className="eyebrow-sm mt-4 text-olive-500">Saved</p>}
          </>
        ) : (
          <form onSubmit={submitAddress} className="space-y-4">
            <h2 className="display-sm text-brand-900">Address</h2>

            {/* Personal fields are edited in their own card — carried forward unchanged. */}
            <input type="hidden" name="name" value={values.name} />
            <input type="hidden" name="contact_name" value={values.contact_name} />
            <input type="hidden" name="phone" value={values.phone} />

            <div>
              <label htmlFor="neighborhood" className={labelClass}>
                Neighborhood <span className="text-red-600">*</span>
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
                Delivery Address <span className="text-red-600">*</span>
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

            {addressError && <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{addressError}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelAddress}
                disabled={isPending}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !addressDirty}
                className="btn btn-primary flex-1"
              >
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
