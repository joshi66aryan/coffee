'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { signInWithEmail, signUpWithEmail } from '@/lib/cafe/actions'
import { createClient } from '@/lib/supabase/client'
import { PasswordStrengthMeter } from '@/components/cafe/password-strength-meter'
import logger from '@/lib/logger'

type EmailMode = 'signin' | 'signup'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 01-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0012 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 014.9 12c0-.79.14-1.56.37-2.28V6.61H1.27A11.998 11.998 0 000 12c0 1.94.46 3.77 1.27 5.39l4-3.11z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

export function LoginForm({ initialError }: { initialError?: string } = {}) {
  const router = useRouter()

  const [emailMode, setEmailMode] = useState<EmailMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const [error, setError] = useState(initialError ?? '')
  const [isPending, startTransition] = useTransition()
  const [isGooglePending, setIsGooglePending] = useState(false)

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const action = emailMode === 'signin' ? signInWithEmail : signUpWithEmail
      const result = await action(email, password)
      if (result.error) { setError(result.error); return }
      if ('confirm' in result && result.confirm) { setAwaitingConfirm(true); return }
      if (result.redirect) router.push(result.redirect)
    })
  }

  async function handleGoogleSignIn() {
    setError('')
    setIsGooglePending(true)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      logger.error('Google sign-in failed', { msg: oauthError.message })
      setError('Could not start Google sign-in. Please try again.')
      setIsGooglePending(false)
    }
    // On success the browser is redirected to Google — no further action here.
  }

  if (awaitingConfirm) {
    return (
      <div className="animate-fade-in text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="display-md mt-6 text-brand-900">Check your inbox</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          We sent a confirmation link to <strong className="text-brand-900">{email}</strong>.
          Click it to activate your account.
        </p>
        <button
          type="button"
          onClick={() => { setAwaitingConfirm(false); setEmailMode('signin') }}
          className="btn btn-outline btn-sm mt-7"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="animate-rise">
      <p className="eyebrow">{emailMode === 'signin' ? 'Welcome back' : 'Join the trail'}</p>
      <h1 className="display-lg mt-3 text-brand-900">
        {emailMode === 'signin' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="mt-3 text-sm text-gray-500">
        {emailMode === 'signin'
          ? 'Access your café’s catalog, pricing and order history.'
          : 'Set up your café account to start ordering.'}
      </p>

      <div className="rule mt-7" />

      <form onSubmit={handleEmailSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourcafe.com"
            required
            autoFocus
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={emailMode === 'signup' ? 10 : 1}
              className="field pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 transition-colors hover:text-brand-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword
                ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
                : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
            </button>
          </div>
          {emailMode === 'signup' && <PasswordStrengthMeter password={password} />}
        </div>

        {emailMode === 'signup' && (
          <label className="flex items-start gap-2.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-sm border-cream-400 accent-brand-900"
            />
            <span>
              I agree with the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900">
                Terms &amp; Conditions
              </Link>
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !email || !password || (emailMode === 'signup' && !agreedToTerms)}
          className="btn btn-primary btn-block btn-lg"
        >
          {isPending
            ? emailMode === 'signin' ? 'Signing in…' : 'Creating account…'
            : emailMode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-cream-300" />
        <span className="eyebrow-sm text-gray-400">Or</span>
        <span className="h-px flex-1 bg-cream-300" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGooglePending}
        className="btn btn-outline btn-block"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => { setEmailMode(emailMode === 'signin' ? 'signup' : 'signin'); setError('') }}
        className="mt-7 w-full text-center text-sm text-gray-500 transition-colors hover:text-brand-900"
      >
        {emailMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <span className="font-semibold text-brand-700 underline underline-offset-2">
          {emailMode === 'signin' ? 'Sign up' : 'Sign in'}
        </span>
      </button>
    </div>
  )
}
