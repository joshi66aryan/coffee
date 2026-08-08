import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileHeaderCard } from '@/components/cafe/profile-header-card'

describe('ProfileHeaderCard', () => {
  it('shows the café name, contact name, phone, and an avatar initial', () => {
    render(
      <ProfileHeaderCard
        cafe={{ name: 'Himalayan Brew', contact_name: 'Ramesh Shrestha', phone: '+9779800000000' }}
      />,
    )
    expect(screen.getByText('Himalayan Brew')).toBeInTheDocument()
    expect(screen.getByText('Ramesh Shrestha')).toBeInTheDocument()
    expect(screen.getByText('+9779800000000')).toBeInTheDocument()
    expect(screen.getByText('H')).toBeInTheDocument()
  })

  it('shows a credit-enabled badge when the café has credit enabled', () => {
    render(
      <ProfileHeaderCard
        cafe={{ name: 'Himalayan Brew', contact_name: 'Ramesh Shrestha', phone: '+9779800000000', credit_enabled: true }}
      />,
    )
    expect(screen.getByText('Credit Enabled')).toBeInTheDocument()
  })

  it('shows a pay-per-order badge when the café has no credit enabled', () => {
    render(
      <ProfileHeaderCard
        cafe={{ name: 'Himalayan Brew', contact_name: 'Ramesh Shrestha', phone: '+9779800000000' }}
      />,
    )
    expect(screen.getByText('Pay per Order')).toBeInTheDocument()
  })
})
