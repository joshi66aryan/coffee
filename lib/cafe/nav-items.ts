import { Home, ShoppingCart, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CafeNavItem {
  href: string
  label: string
  icon: LucideIcon
}

// Settings and Logout are not primary nav destinations — they live under the
// Profile page's Account settings (/settings), so they're intentionally excluded here.
export const CAFE_NAV_ITEMS: CafeNavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/orders', label: 'Cart', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
]
