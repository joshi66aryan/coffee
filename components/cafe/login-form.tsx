'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtp, signInWithEmail, signUpWithEmail } from '@/lib/cafe/actions'
import { toNepalPhone } from '@/lib/cafe/phone'

type Tab = 'phone' | 'email'
type EmailMode = 'signin' | 'signup'

export function LoginForm() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('phone')

  // Phone state
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [formattedPhone, setFormattedPhone] = useState('')
  const [otp, setOtp] = useState('')

  // Email state
  const [emailMode, setEmailMode] = useState<EmailMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
  }

  // --- Phone handlers ---
  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const formatted = toNepalPhone(phoneInput)
    setFormattedPhone(formatted)

    startTransition(async () => {
      const result = await sendOtp(formatted)
      if (result.error) { setError(result.error); return }
      setStep('otp')
    })
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await verifyOtp(formattedPhone, otp)
      if (result.error) { setError(result.error); return }
      if (result.redirect) router.push(result.redirect)
    })
  }

  // --- Email handlers ---
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

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex rounded-lg border border-gray-200 p-1 mb-5 gap-1">
        <button
          type="button"
          onClick={() => switchTab('phone')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'phone'
              ? 'bg-amber-600 text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Phone
        </button>
        <button
          type="button"
          onClick={() => switchTab('email')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'email'
              ? 'bg-amber-600 text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Email
        </button>
      </div>

      {/* Phone tab */}
      {tab === 'phone' && step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm select-none">
                +977
              </span>
              <input
                id="phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="98XXXXXXXX"
                required
                autoFocus
                className="flex-1 block w-full px-3 py-3 rounded-r-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !phoneInput}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Sending…' : 'Send Code'}
          </button>
        </form>
      )}

      {tab === 'phone' && step === 'otp' && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to <strong>{formattedPhone}</strong>
          </p>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              autoFocus
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 text-center text-2xl tracking-[0.5em] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending || otp.length !== 6}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Verifying…' : 'Verify Code'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError('') }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
          >
            Use a different number
          </button>
        </form>
      )}

      {/* Email tab — awaiting confirmation */}
      {tab === 'email' && awaitingConfirm && (
        <div className="text-center space-y-3 py-2">
          <p className="text-sm text-gray-700">
            Check your inbox at <strong>{email}</strong> and click the confirmation link to activate your account.
          </p>
          <button
            type="button"
            onClick={() => { setAwaitingConfirm(false); setEmailMode('signin') }}
            className="text-sm text-amber-600 hover:text-amber-700"
          >
            Back to sign in
          </button>
        </div>
      )}

      {/* Email tab */}
      {tab === 'email' && !awaitingConfirm && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="block w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !email || !password}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? emailMode === 'signin' ? 'Signing in…' : 'Creating account…'
              : emailMode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => { setEmailMode(emailMode === 'signin' ? 'signup' : 'signin'); setError('') }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
          >
            {emailMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      )}
    </div>
  )
}
