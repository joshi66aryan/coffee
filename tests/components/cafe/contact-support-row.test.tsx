import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContactSupportRow } from '@/components/cafe/contact-support-row'

describe('ContactSupportRow', () => {
  it('links to WhatsApp support and opens it in a new tab', () => {
    render(<ContactSupportRow />)
    const link = screen.getByRole('link', { name: /need help/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
