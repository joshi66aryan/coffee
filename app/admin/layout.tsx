import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

const NAV_LINKS = [
  { href: '/admin', label: 'Orders' },
  { href: '/admin/cafes', label: 'Cafés' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/payments', label: 'Payments' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-bold text-amber-700 text-sm tracking-wide uppercase">
              Sherpa Sips Admin
            </span>
            <nav className="hidden sm:flex items-center gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <SignOutButton />
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex border-t border-gray-100">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 text-center py-2.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  )
}
