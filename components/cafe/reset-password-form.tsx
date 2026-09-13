'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { completePasswordReset } from '@/lib/cafe/actions'
import { PasswordStrengthMeter } from '@/components/cafe/password-strength-meter'

export function ResetPasswordForm() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    startTransition(async () => {
      const result = await completePasswordReset(password)
      if (result.error) {
        setError(result.error)
        return
      }
      setPassword('')
      setConfirmPassword('')
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="display-md mt-6 text-brand-900">Password updated</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          You can now sign in with your new password.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="btn btn-primary btn-block btn-lg mt-7"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="animate-rise">
      <p className="eyebrow">Almost there</p>
      <h1 className="display-lg mt-3 text-brand-900">Choose a new password</h1>
      <p className="mt-3 text-sm text-gray-500">
        Pick something you haven’t used on this account before.
      </p>

      <div className="rule mt-7" />

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="new_password" className="field-label">
            New password <span className="text-red-600">*</span>
          </label>
          <input
            id="new_password"
            type="password"
            required
            autoFocus
            minLength={10}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="field"
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <div>
          <label htmlFor="confirm_password" className="field-label">
            Confirm password <span className="text-red-600">*</span>
          </label>
          <input
            id="confirm_password"
            type="password"
            required
            minLength={10}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••••"
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !password || !confirmPassword}
          className="btn btn-primary btn-block btn-lg"
        >
          {isPending ? 'Saving…' : 'Set new password'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-gray-500">
        <Link href="/login" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
