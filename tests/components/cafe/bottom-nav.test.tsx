import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { BottomNav } from '@/components/cafe/bottom-nav'

let currentPathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}))

/**
 * Stands in for the visual viewport jsdom does not implement, so the bar's
 * keyboard behaviour can be exercised. See lib/cafe/use-keyboard-open.ts.
 */
const LAYOUT_HEIGHT = 800

class FakeVisualViewport extends EventTarget {
  constructor(public height: number) {
    super()
  }

  resizeTo(height: number) {
    this.height = height
    this.dispatchEvent(new Event('resize'))
  }
}

function installViewport(): FakeVisualViewport {
  const viewport = new FakeVisualViewport(LAYOUT_HEIGHT)
  Object.defineProperty(window, 'visualViewport', {
    value: viewport,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(window, 'innerHeight', {
    value: LAYOUT_HEIGHT,
    configurable: true,
    writable: true,
  })
  return viewport
}

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', {
    value: undefined,
    configurable: true,
    writable: true,
  })
})

describe('BottomNav', () => {
  it('shows Home, Cart, and Profile tabs', () => {
    currentPathname = '/'
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile')
  })

  it('no longer shows a "Shop", "Orders", or "Settings" label — Settings lives inside Profile', () => {
    currentPathname = '/'
    render(<BottomNav />)
    expect(screen.queryByText('Shop')).not.toBeInTheDocument()
    expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders nothing on drill-down routes like /settings, matching the /orders/[id] convention', () => {
    currentPathname = '/settings'
    const { container } = render(<BottomNav />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing on routes outside the café shell', () => {
    currentPathname = '/login'
    const { container } = render(<BottomNav />)
    expect(container).toBeEmptyDOMElement()
  })

  it('gets out of the way while the keyboard is open, instead of stranding itself over the page', () => {
    currentPathname = '/'
    const viewport = installViewport()
    const { container } = render(<BottomNav />)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()

    // Tapping Search opens the keyboard: iOS shrinks the visual viewport but
    // not the layout viewport a `fixed` bar is anchored to.
    act(() => viewport.resizeTo(LAYOUT_HEIGHT - 320))
    expect(container).toBeEmptyDOMElement()
  })

  it('comes back once the keyboard is dismissed', () => {
    currentPathname = '/'
    const viewport = installViewport()
    render(<BottomNav />)

    act(() => viewport.resizeTo(LAYOUT_HEIGHT - 320))
    act(() => viewport.resizeTo(LAYOUT_HEIGHT))
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  })

  it('stays put for an inset the size of collapsing browser chrome', () => {
    currentPathname = '/'
    const viewport = installViewport()
    render(<BottomNav />)

    act(() => viewport.resizeTo(LAYOUT_HEIGHT - 60))
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  })
})
