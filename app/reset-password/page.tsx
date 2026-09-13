import { ResetPasswordForm } from '@/components/cafe/reset-password-form'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'

export const metadata = { title: 'Set a new password — Sherpa Sips' }

/**
 * Reached only by following a recovery link, which /auth/confirm exchanges for
 * a session before forwarding here. The page itself is deliberately thin: the
 * authorisation that matters is in `completePasswordReset`, which checks that
 * the session really was minted by a recovery token rather than trusting that
 * anyone who can load this URL is entitled to set a password.
 */
export default function ResetPasswordPage() {
  return (
    <main className="texture-paper flex min-h-screen flex-col items-center justify-center bg-cream-100 px-5 py-14 sm:px-10">
      <div className="w-full max-w-sm">
        <SherpaSipsLogo variant="horizontal" className="mb-10 h-10 text-brand-900" />
        <ResetPasswordForm />
      </div>
    </main>
  )
}
