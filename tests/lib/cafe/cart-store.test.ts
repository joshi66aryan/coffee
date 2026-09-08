import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeToCart,
  setCart,
  updateCart,
  clearCart,
  cartItemCount,
} from '@/lib/cafe/cart-store'

const CART_KEY = 'sherpa-cart'

describe('cart store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getCartSnapshot', () => {
    it('reads the cart written to localStorage', () => {
      localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 2 }))
      expect(getCartSnapshot()).toEqual({ 'product-1': 2 })
    })

    it('returns an empty cart when nothing is stored', () => {
      expect(getCartSnapshot()).toEqual({})
    })

    it('returns an empty cart for malformed JSON rather than throwing', () => {
      localStorage.setItem(CART_KEY, 'not json')
      expect(getCartSnapshot()).toEqual({})
    })

    it('returns an empty cart when the stored value is not an object', () => {
      localStorage.setItem(CART_KEY, JSON.stringify([1, 2, 3]))
      expect(getCartSnapshot()).toEqual({})
    })

    // useSyncExternalStore re-renders whenever getSnapshot returns a new
    // reference, so an unchanged cart must return the identical object or
    // every subscribed component would re-render in a loop.
    it('returns the identical object while the cart is unchanged', () => {
      localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 2 }))
      expect(getCartSnapshot()).toBe(getCartSnapshot())
    })

    it('returns the identical empty object while the cart stays empty', () => {
      expect(getCartSnapshot()).toBe(getCartSnapshot())
    })

    it('returns a new object once the cart changes', () => {
      localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 2 }))
      const first = getCartSnapshot()
      setCart({ 'product-1': 3 })
      expect(getCartSnapshot()).not.toBe(first)
      expect(getCartSnapshot()).toEqual({ 'product-1': 3 })
    })
  })

  it('renders an empty cart on the server', () => {
    expect(getServerCartSnapshot()).toEqual({})
  })

  describe('setCart', () => {
    it('persists to localStorage', () => {
      setCart({ 'product-1': 4 })
      expect(JSON.parse(localStorage.getItem(CART_KEY) ?? '{}')).toEqual({ 'product-1': 4 })
    })

    it('notifies subscribers', () => {
      const listener = vi.fn()
      subscribeToCart(listener)
      setCart({ 'product-1': 1 })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = subscribeToCart(listener)
      unsubscribe()
      setCart({ 'product-1': 1 })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('updateCart', () => {
    it('applies the update to the current cart', () => {
      setCart({ 'product-1': 1 })
      updateCart(previous => ({ ...previous, 'product-2': 5 }))
      expect(getCartSnapshot()).toEqual({ 'product-1': 1, 'product-2': 5 })
    })

    // Two writes in the same tick must both survive — the reason this takes a
    // function rather than a plain value.
    it('does not drop a second update issued in the same tick', () => {
      setCart({ 'product-1': 1 })
      updateCart(previous => ({ ...previous, a: 1 }))
      updateCart(previous => ({ ...previous, b: 2 }))
      expect(getCartSnapshot()).toEqual({ 'product-1': 1, a: 1, b: 2 })
    })
  })

  describe('clearCart', () => {
    it('removes the stored cart and notifies', () => {
      setCart({ 'product-1': 1 })
      const listener = vi.fn()
      subscribeToCart(listener)

      clearCart()

      expect(localStorage.getItem(CART_KEY)).toBeNull()
      expect(getCartSnapshot()).toEqual({})
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('cartItemCount', () => {
    it('sums the quantities', () => {
      expect(cartItemCount({ a: 2, b: 3 })).toBe(5)
    })

    it('is zero for an empty cart', () => {
      expect(cartItemCount({})).toBe(0)
    })
  })
})
