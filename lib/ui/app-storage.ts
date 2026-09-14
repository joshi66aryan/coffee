/**
 * Everything this app keeps in the browser, and who it belongs to.
 *
 * All of this state was previously stored under fixed keys with nothing tying
 * it to an account, and nothing cleared it at sign-out. On a shared browser
 * that leaked between cafés: the next person to sign in inherited the previous
 * one's cart — and could place an order for items they never chose — along with
 * their dismissal of the notification prompt, which is why a fresh account
 * could find the prompt already gone.
 *
 * The keys live here rather than next to the components that use them so that
 * `clearPerAccountStorage` cannot fall out of step with the list. A new key
 * added anywhere else is a new leak; a new key added here is covered.
 */

/** Which account the browser-stored state below currently belongs to. */
export const SESSION_OWNER_KEY = 'sherpa-session-owner'

export const CART_KEY = 'sherpa-cart'
export const CAFE_PUSH_DISMISS_KEY = 'sherpa-push-prompt-dismissed'
export const ADMIN_PUSH_DISMISS_KEY = 'sherpa-admin-push-prompt-dismissed'
export const INSTALL_DISMISS_KEY = 'sherpa-install-prompt-dismissed'
export const BUY_AGAIN_DISMISS_KEY = 'sherpa-buy-again-dismissed'

/** Every key that belongs to one signed-in account and must not outlive it. */
export const PER_ACCOUNT_KEYS = [
  CART_KEY,
  CAFE_PUSH_DISMISS_KEY,
  ADMIN_PUSH_DISMISS_KEY,
  INSTALL_DISMISS_KEY,
  BUY_AGAIN_DISMISS_KEY,
] as const

export function clearPerAccountStorage(): void {
  try {
    for (const key of PER_ACCOUNT_KEYS) localStorage.removeItem(key)
  } catch {
    // Safari private mode throws on access rather than returning null. Nothing
    // to clear in that case — the values were never written either.
  }
}

export function readSessionOwner(): string | null {
  try {
    return localStorage.getItem(SESSION_OWNER_KEY)
  } catch {
    return null
  }
}

export function writeSessionOwner(userId: string): void {
  try {
    localStorage.setItem(SESSION_OWNER_KEY, userId)
  } catch {
    // See clearPerAccountStorage.
  }
}

export function clearSessionOwner(): void {
  try {
    localStorage.removeItem(SESSION_OWNER_KEY)
  } catch {
    // See clearPerAccountStorage.
  }
}

/**
 * Point the browser's stored state at `userId`, discarding it if it belonged to
 * someone else. Returns whether anything was discarded.
 *
 * An *absent* owner is deliberately adopted rather than treated as a mismatch.
 * Every existing browser has no owner recorded until this ships, and treating
 * that as "belongs to someone else" would empty the cart of every café who
 * happened to be mid-shop when the deploy landed. The state in that browser
 * does belong to whoever is signed in — there was only ever one account's worth
 * of it — so claiming it is both safe and the kinder transition.
 */
export function adoptSessionOwner(userId: string): boolean {
  const previous = readSessionOwner()

  if (previous === userId) return false

  const belongedToSomeoneElse = previous !== null
  if (belongedToSomeoneElse) clearPerAccountStorage()

  writeSessionOwner(userId)
  return belongedToSomeoneElse
}
