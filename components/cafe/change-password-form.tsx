'use client'

import { useState, useTransition } from 'react'
import { changePassword } from '@/lib/cafe/actions'

const fieldClass =
  'block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canSubmit = password.length > 0 && confirmPassword.length > 0

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    startTransition(async () => {
      const result = await changePassword(password)
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      setPassword('')
      setConfirmPassword('')
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5"
    >
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Change Password</h2>

      <div>
        <label htmlFor="new_password" className={labelClass}>
          New Password <span className="text-red-500">*</span>
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => {
            setPassword(e.target.value)
            setSaved(false)
          }}
          placeholder="••••••••"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className={labelClass}>
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={e => {
            setConfirmPassword(e.target.value)
            setSaved(false)
          }}
          placeholder="••••••••"
          className={fieldClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-sm text-emerald-600">Password updated!</p>}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}
