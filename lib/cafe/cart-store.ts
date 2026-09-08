'use client'

/**
 * The cart lives in localStorage so it survives reloads and offline use, but
 * localStorage has no change notification for writes made by the *same* tab.
 * Six components need to react to it (the header badge, the bottom-nav badge,
 * the catalog grid, the cart page, its empty state, and the repeat-order card),
 * and each one previously solved that by polling `localStorage` on a 500ms
 * `setInterval` for the lifetime of the page — two or three permanently
 * running timers on every café screen, parsing JSON twice a second whether or
 * not anything had changed.
 *
 * This is the same store-plus-hook shape as lib/pwa/install-prompt-store.ts:
 * one module owns the key, writes go through it, and subscribers are notified
 * synchronously. No timers.
 */

export type CartQuantities = Record<string, number>

const CART_KEY = 'sherpa-cart'

// Shared frozen identity for "no cart". useSyncExternalStore re-renders
// whenever getSnapshot returns a new reference, so every empty result has to
// be the *same* empty object or the component would re-render forever.
const EMPTY: CartQuantities = Object.freeze({})

type Listener = () => void
const listeners = new Set<Listener>()

// getSnapshot runs on every render and must be referentially stable between
// renders that see the same cart. localStorage.getItem is cheap; JSON.parse
// and the object it allocates are not, so the parsed value is memoised
// against the exact string it came from.
let cachedRaw: string | null = null
let cachedValue: CartQuantities = EMPTY

function parse(raw: string | null): CartQuantities {
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return EMPTY
    return parsed as CartQuantities
  } catch {
    return EMPTY
  }
}

function notify(): void {
  listeners.forEach(listener => listener())
}

export function getCartSnapshot(): CartQuantities {
  let raw: string | null
  try {
    raw = localStorage.getItem(CART_KEY)
  } catch {
    // Safari private mode throws on access rather than returning null.
    return EMPTY
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = parse(raw)
  }
  return cachedValue
}

// The server has no cart. Rendering an empty one server-side and letting the
// real value arrive after hydration is what the polling versions effectively
// did too (they all started at 0), so the visible behaviour is unchanged.
export function getServerCartSnapshot(): CartQuantities {
  return EMPTY
}

export function subscribeToCart(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setCart(next: CartQuantities): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(next))
  } catch {
    // Quota or private mode — the in-memory notify below still keeps the
    // current page consistent for this session.
  }
  notify()
}

/** Functional update, so rapid successive writes in one tick can't clobber each other. */
export function updateCart(update: (previous: CartQuantities) => CartQuantities): void {
  setCart(update(getCartSnapshot()))
}

export function clearCart(): void {
  try {
    localStorage.removeItem(CART_KEY)
  } catch {
    // See setCart.
  }
  notify()
}

export function cartItemCount(quantities: CartQuantities): number {
  let total = 0
  for (const quantity of Object.values(quantities)) total += quantity
  return total
}

// Another tab changed the cart. `key` is null when that tab called clear().
function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== CART_KEY) return
  notify()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorage)
}
