import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OfflinePage from '@/app/offline/page'

describe('OfflinePage', () => {
  it('renders the offline message', () => {
    render(<OfflinePage />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
    expect(screen.getByText(/needs a connection/i)).toBeInTheDocument()
  })

  // The service worker answers a failed navigation with this page's markup and
  // leaves the address alone, so a query-only href retries the page that
  // actually failed. Sending the retry to '/' instead lost it — click a
  // notification for an order while the connection is down and the order id
  // was simply gone.
  it('retries the page that failed, not the home page', () => {
    render(<OfflinePage />)
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute('href', '?')
  })

  // Reached directly — the middleware redirects here when Supabase itself is
  // unreachable — retrying just re-renders this page, so there has to be a way
  // off it.
  it('offers a way home as well', () => {
    render(<OfflinePage />)
    expect(screen.getByRole('link', { name: /home page/i })).toHaveAttribute('href', '/')
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
