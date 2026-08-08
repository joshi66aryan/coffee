import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminNavDesktop, AdminNavMobile } from '@/components/admin/admin-nav'

let currentPathname = '/admin'
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}))

describe('AdminNavDesktop', () => {
  it('marks Dashboard as the current page on /admin', () => {
    currentPathname = '/admin'
    render(<AdminNavDesktop />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Orders' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Cafés' })).not.toHaveAttribute('aria-current')
  })

  it('marks Orders as current on /admin/orders', () => {
    currentPathname = '/admin/orders'
    render(<AdminNavDesktop />)
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('marks Orders as current on a nested order detail route', () => {
    currentPathname = '/admin/orders/abc-123'
    render(<AdminNavDesktop />)
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks Cafés as current on a nested café detail route', () => {
    currentPathname = '/admin/cafes/abc-123'
    render(<AdminNavDesktop />)
    expect(screen.getByRole('link', { name: 'Cafés' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Orders' })).not.toHaveAttribute('aria-current')
  })

  it('marks Payments as current on /admin/payments', () => {
    currentPathname = '/admin/payments'
    render(<AdminNavDesktop />)
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('AdminNavMobile', () => {
  it('marks Products as current on a nested product route', () => {
    currentPathname = '/admin/products/new'
    render(<AdminNavMobile />)
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Orders' })).not.toHaveAttribute('aria-current')
  })
})
