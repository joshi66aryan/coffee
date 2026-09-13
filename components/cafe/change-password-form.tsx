'use client'

import { useState, useTransition } from 'react'
import { changePassword } from '@/lib/cafe/actions'
import { PasswordStrengthMeter } from '@/components/cafe/password-strength-meter'
import { EditButton } from '@/components/cafe/edit-button'
import { DisplayField } from '@/components/cafe/display-field'

const fieldClass = 'field'
const labelClass = 'field-label'

/**
 * `hasPassword` is false for an account that only ever signed in with Google —
 * there is no current password to ask for, and this form is setting the first
 * one rather than changing an existing one.
 */
export function ChangePasswordForm({ hasPassword = true }: { hasPassword?: boolean } = {}) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canSubmit =
    password.length > 0 && confirmPassword.length > 0 && (!hasPassword || currentPassword.length > 0)

  function startEditing() {
    setError('')
    setSaved(false)
    setIsEditing(true)
  }

  function cancelEditing() {
    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setIsEditing(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    startTransition(async () => {
      const result = await changePassword(currentPassword, password)
      if (result.error) {
        setError(result.error)
        return
      }
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      setSaved(true)
      setIsEditing(false)
    })
  }

  if (!isEditing) {
    return (
      <div className="rounded-xl border border-cream-300 bg-white p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="display-sm text-brand-900">Password</h2>
          <EditButton onClick={startEditing} />
        </div>
        <DisplayField label="Password" value="••••••••••" />
        {saved && <p className="eyebrow-sm mt-4 text-olive-500">Password updated!</p>}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-cream-300 bg-white p-5"
    >
      <h2 className="display-sm text-brand-900">Password</h2>

      {hasPassword ? (
        <div>
          <label htmlFor="current_password" className={labelClass}>
            Current Password <span className="text-red-600">*</span>
          </label>
          <input
            id="current_password"
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>
      ) : (
        <p className="border-l-2 border-cream-400 bg-cream-50 px-3 py-2 text-sm text-gray-600">
          You signed up with Google. Setting a password here lets you sign in with
          your email address as well.
        </p>
      )}

      <div>
        <label htmlFor="new_password" className={labelClass}>
          New Password <span className="text-red-600">*</span>
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={10}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className={fieldClass}
        />
        <PasswordStrengthMeter password={password} />
      </div>

      <div>
        <label htmlFor="confirm_password" className={labelClass}>
          Confirm Password <span className="text-red-600">*</span>
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={10}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className={fieldClass}
        />
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isPending}
          className="btn btn-outline flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="btn btn-primary flex-1"
        >
          {isPending ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </form>
  )
}
