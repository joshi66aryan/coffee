import { describe, it, expect, beforeEach } from 'vitest'
import {
  SESSION_OWNER_KEY,
  CART_KEY,
  CAFE_PUSH_DISMISS_KEY,
  INSTALL_DISMISS_KEY,
  BUY_AGAIN_DISMISS_KEY,
  PER_ACCOUNT_KEYS,
  clearPerAccountStorage,
  readSessionOwner,
  clearSessionOwner,
  adoptSessionOwner,
} from '@/lib/ui/app-storage'

const CAFE_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const CAFE_B = 'bbbbbbbb-0000-4000-8000-000000000002'

function fillEveryKey() {
  localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 2 }))
  localStorage.setItem(CAFE_PUSH_DISMISS_KEY, '1')
  localStorage.setItem(INSTALL_DISMISS_KEY, '1')
  localStorage.setItem(BUY_AGAIN_DISMISS_KEY, 'A1B2C3')
}

describe('app storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('clears every per-account key', () => {
    fillEveryKey()
    clearPerAccountStorage()

    for (const key of PER_ACCOUNT_KEYS) {
      expect(localStorage.getItem(key)).toBeNull()
    }
  })

  // The owner key is not per-account state — it is the record of *which*
  // account the state belongs to, so clearing the state must not clear it.
  it('leaves the session owner in place when clearing per-account state', () => {
    adoptSessionOwner(CAFE_A)
    clearPerAccountStorage()

    expect(readSessionOwner()).toBe(CAFE_A)
  })

  describe('adoptSessionOwner', () => {
    it('claims state with no recorded owner rather than discarding it', () => {
      fillEveryKey()

      expect(adoptSessionOwner(CAFE_A)).toBe(false)
      expect(localStorage.getItem(CART_KEY)).not.toBeNull()
      expect(readSessionOwner()).toBe(CAFE_A)
    })

    it('does nothing when the state already belongs to this account', () => {
      adoptSessionOwner(CAFE_A)
      fillEveryKey()

      expect(adoptSessionOwner(CAFE_A)).toBe(false)
      expect(localStorage.getItem(CART_KEY)).not.toBeNull()
    })

    // The bug this exists for: café A signs out, café B signs in on the same
    // browser, and finds A's cart waiting — one confirm away from an order
    // nobody chose.
    it('discards state belonging to a different account', () => {
      adoptSessionOwner(CAFE_A)
      fillEveryKey()

      expect(adoptSessionOwner(CAFE_B)).toBe(true)

      for (const key of PER_ACCOUNT_KEYS) {
        expect(localStorage.getItem(key)).toBeNull()
      }
      expect(readSessionOwner()).toBe(CAFE_B)
    })

    it('records the new owner so the next visit is not treated as a change', () => {
      adoptSessionOwner(CAFE_A)
      adoptSessionOwner(CAFE_B)

      expect(adoptSessionOwner(CAFE_B)).toBe(false)
    })

    // Signing out wipes the owner, so the next account in is a fresh claim
    // rather than a mismatch — and has nothing left to inherit either way.
    it('treats a signed-out browser as unowned', () => {
      adoptSessionOwner(CAFE_A)
      clearSessionOwner()

      expect(localStorage.getItem(SESSION_OWNER_KEY)).toBeNull()
      expect(adoptSessionOwner(CAFE_B)).toBe(false)
    })
  })
})
