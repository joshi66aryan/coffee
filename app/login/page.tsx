import { LoginForm } from '@/components/cafe/login-form'

export const metadata = { title: 'Sign in — Sherpa Sips' }

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">☕</div>
          <h1 className="text-2xl font-bold text-amber-900">Sherpa Sips</h1>
          <p className="mt-1 text-sm text-gray-500">Café supply ordering</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Sign in with your phone</h2>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
