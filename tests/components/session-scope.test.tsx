import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { SessionScope } from '@/components/session-scope'
import { CART_KEY, CAFE_PUSH_DISMISS_KEY, adoptSessionOwner } from '@/lib/ui/app-storage'
import { getCartSnapshot, subscribeToCart } from '@/lib/cafe/cart-store'

const CAFE_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const CAFE_B = 'bbbbbbbb-0000-4000-8000-000000000002'

describe('SessionScope', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders nothing', () => {
    const { container } = render(<SessionScope userId={CAFE_A} />)
    expect(container).toBeEmptyDOMElement()
  })

  // The bug: café A signs out without clearing, café B signs in on the same
  // browser and finds A's cart — one confirm away from an order nobody chose.
  it('discards a cart left behind by a different café', async () => {
    adoptSessionOwner(CAFE_A)
    localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 3 }))
    localStorage.setItem(CAFE_PUSH_DISMISS_KEY, '1')

    render(<SessionScope userId={CAFE_B} />)

    await waitFor(() => {
      expect(localStorage.getItem(CART_KEY)).toBeNull()
      expect(localStorage.getItem(CAFE_PUSH_DISMISS_KEY)).toBeNull()
    })
  })

  it('keeps the cart when the same café returns', async () => {
    adoptSessionOwner(CAFE_A)
    localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 3 }))

    render(<SessionScope userId={CAFE_A} />)

    await waitFor(() => {
      expect(getCartSnapshot()).toEqual({ 'product-1': 3 })
    })
  })

  // Every browser has no recorded owner until this ships. Treating that as a
  // mismatch would empty the cart of every café mid-shop when it deploys.
  it('claims an unowned cart rather than emptying it', async () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 3 }))

    render(<SessionScope userId={CAFE_A} />)

    await waitFor(() => {
      expect(getCartSnapshot()).toEqual({ 'product-1': 3 })
    })
  })

  // The cart is read through useSyncExternalStore, which cannot see a key
  // removed out from under it — without this the badge keeps its old count.
  it('tells subscribers the cart changed', async () => {
    adoptSessionOwner(CAFE_A)
    localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 3 }))

    const listener = vi.fn()
    const unsubscribe = subscribeToCart(listener)

    render(<SessionScope userId={CAFE_B} />)

    await waitFor(() => expect(listener).toHaveBeenCalled())
    expect(getCartSnapshot()).toEqual({})

    unsubscribe()
  })
})
