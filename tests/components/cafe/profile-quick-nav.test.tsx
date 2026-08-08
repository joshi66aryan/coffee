import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileQuickNav } from '@/components/cafe/profile-quick-nav'

describe('ProfileQuickNav', () => {
  it('links Orders to the full order history page', () => {
    render(<ProfileQuickNav />)
    expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/profile/orders')
  })

  it('links Account to /settings', () => {
    render(<ProfileQuickNav />)
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/settings')
  })
})
