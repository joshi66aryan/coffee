import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardOpen } from '@/lib/cafe/use-keyboard-open'

/**
 * jsdom implements no visual viewport at all, so the real one is stood in for
 * here. Only the two members the hook reads are modelled: a height, and the
 * events fired when it changes.
 */
class FakeVisualViewport extends EventTarget {
  constructor(public height: number) {
    super()
  }

  /** The keyboard opening or closing: height changes, `resize` fires. */
  resizeTo(height: number) {
    this.height = height
    this.dispatchEvent(new Event('resize'))
  }

  /** iOS panning the viewport without ever firing `resize`. */
  panned() {
    this.dispatchEvent(new Event('scroll'))
  }
}

const LAYOUT_HEIGHT = 800

function installViewport(height: number): FakeVisualViewport {
  const viewport = new FakeVisualViewport(height)
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

describe('useKeyboardOpen', () => {
  it('is false when the visual viewport fills the layout viewport', () => {
    installViewport(LAYOUT_HEIGHT)
    const { result } = renderHook(() => useKeyboardOpen())
    expect(result.current).toBe(false)
  })

  it('becomes true once a keyboard-sized inset appears', () => {
    const viewport = installViewport(LAYOUT_HEIGHT)
    const { result } = renderHook(() => useKeyboardOpen())

    act(() => viewport.resizeTo(LAYOUT_HEIGHT - 320))
    expect(result.current).toBe(true)
  })

  it('returns to false when the keyboard is dismissed', () => {
    const viewport = installViewport(LAYOUT_HEIGHT)
    const { result } = renderHook(() => useKeyboardOpen())

    act(() => viewport.resizeTo(LAYOUT_HEIGHT - 320))
    act(() => viewport.resizeTo(LAYOUT_HEIGHT))
    expect(result.current).toBe(false)
  })

  it('ignores an inset the size of collapsing browser chrome', () => {
    const viewport = installViewport(LAYOUT_HEIGHT)
    const { result } = renderHook(() => useKeyboardOpen())

    // The Safari URL bar collapsing on scroll — not a keyboard.
    act(() => viewport.resizeTo(LAYOUT_HEIGHT - 60))
    expect(result.current).toBe(false)
  })

  it('re-reads the inset when the viewport is panned without resizing', () => {
    const viewport = installViewport(LAYOUT_HEIGHT)
    const { result } = renderHook(() => useKeyboardOpen())

    // Height changes with no resize event, exactly as iOS does it.
    viewport.height = LAYOUT_HEIGHT - 320
    act(() => viewport.panned())
    expect(result.current).toBe(true)
  })

  it('reports false rather than throwing where visualViewport is unsupported', () => {
    const { result } = renderHook(() => useKeyboardOpen())
    expect(result.current).toBe(false)
  })

  it('detaches its listeners on unmount', () => {
    const viewport = installViewport(LAYOUT_HEIGHT)
    const { unmount } = renderHook(() => useKeyboardOpen())
    unmount()

    // Would throw inside a detached store subscription if still attached.
    expect(() => viewport.resizeTo(LAYOUT_HEIGHT - 320)).not.toThrow()
  })
})
