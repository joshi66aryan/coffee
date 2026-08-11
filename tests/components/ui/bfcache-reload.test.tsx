import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { BfcacheReload } from '@/components/ui/bfcache-reload'

afterEach(() => {
  vi.restoreAllMocks()
})

function firePageShow(persisted: boolean) {
  const event = new Event('pageshow') as PageTransitionEvent
  Object.defineProperty(event, 'persisted', { value: persisted })
  window.dispatchEvent(event)
}

describe('BfcacheReload', () => {
  it('reloads the page when restored from bfcache', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })

    render(<BfcacheReload />)
    firePageShow(true)

    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload on a normal (non-bfcache) page load', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })

    render(<BfcacheReload />)
    firePageShow(false)

    expect(reload).not.toHaveBeenCalled()
  })

  it('renders nothing', () => {
    const { container } = render(<BfcacheReload />)
    expect(container).toBeEmptyDOMElement()
  })
})
