import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OfflinePage from '@/app/offline/page'

describe('OfflinePage', () => {
  it('renders the offline message and a retry link', () => {
    render(<OfflinePage />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    expect(screen.getByText(/needs a connection/i)).toBeInTheDocument()

    const retryLink = screen.getByRole('link', { name: /try again/i })
    expect(retryLink).toHaveAttribute('href', '/')
  })

  it('styles itself with inline styles rather than Tailwind classes', () => {
    // This page can be served entirely from the service worker cache while
    // offline, so it must not depend on the external stylesheet loading.
    const { container } = render(<OfflinePage />)
    const main = container.querySelector('main')
    expect(main).not.toHaveAttribute('class')
    expect(main).toHaveAttribute('style')
  })
})
