import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ClearCartOnMount } from '@/components/cafe/clear-cart-on-mount'

beforeEach(() => {
  localStorage.clear()
})

describe('ClearCartOnMount', () => {
  it('removes the stored cart on mount', () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2 }))

    const { container } = render(<ClearCartOnMount />)

    expect(localStorage.getItem('sherpa-cart')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('does nothing (and does not throw) when there is no stored cart', () => {
    expect(() => render(<ClearCartOnMount />)).not.toThrow()
    expect(localStorage.getItem('sherpa-cart')).toBeNull()
  })
})
