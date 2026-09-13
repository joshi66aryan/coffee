'use client'

import { useSyncExternalStore } from 'react'

/**
 * A visual-viewport inset this large is an on-screen keyboard rather than
 * browser chrome. Phone keyboards run ~260–340px tall; the Safari URL bar
 * collapsing on scroll accounts for ~60px, well under this.
 */
const KEYBOARD_MIN_INSET = 120

function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport
  if (!viewport) return () => {}

  // `scroll` matters as much as `resize`: iOS pans the visual viewport to keep
  // the focused field above the keyboard without ever firing a resize.
  viewport.addEventListener('resize', onChange)
  viewport.addEventListener('scroll', onChange)
  return () => {
    viewport.removeEventListener('resize', onChange)
    viewport.removeEventListener('scroll', onChange)
  }
}

function getSnapshot(): boolean {
  const viewport = window.visualViewport
  if (!viewport) return false
  return window.innerHeight - viewport.height > KEYBOARD_MIN_INSET
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * True while an on-screen keyboard is covering part of the viewport.
 *
 * iOS Safari positions `fixed` elements against the *layout* viewport, which
 * the keyboard does not shrink. A bottom-anchored bar therefore stays pinned
 * to where the bottom used to be, and once the page is scrolled it is left
 * stranded across the middle of the content. No CSS avoids this — the visual
 * viewport has to be measured.
 */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
