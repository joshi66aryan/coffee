import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ServiceWorkerRegister } from '@/components/ui/service-worker-register'

afterEach(() => {
  // @ts-expect-error — jsdom's navigator is configurable in this test env
  delete navigator.serviceWorker
})

describe('ServiceWorkerRegister', () => {
  it('registers /sw.js unconditionally when the browser supports service workers', () => {
    const register = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true })

    render(<ServiceWorkerRegister />)

    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('does nothing when service workers are unsupported', () => {
    // @ts-expect-error — jsdom's navigator is configurable in this test env
    delete navigator.serviceWorker
    const { container } = render(<ServiceWorkerRegister />)
    expect(container).toBeEmptyDOMElement()
  })
})
