import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallPromptBanner } from '@/components/ui/install-prompt-banner'
import { __resetInstallPromptStoreForTests } from '@/lib/pwa/install-prompt-store'

type FakeBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as FakeBeforeInstallPromptEvent
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  window.dispatchEvent(event)
  return event
}

beforeEach(() => {
  localStorage.clear()
  __resetInstallPromptStoreForTests()
})

describe('InstallPromptBanner', () => {
  it('renders nothing when the browser has not signaled installability', () => {
    const { container } = render(<InstallPromptBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the banner once beforeinstallprompt fires', async () => {
    render(<InstallPromptBanner />)
    fireBeforeInstallPrompt()
    await waitFor(() => expect(screen.getByText('Install Sherpa Sips')).toBeInTheDocument())
  })

  it('prompts install and dismisses itself when the user accepts', async () => {
    render(<InstallPromptBanner />)
    const event = fireBeforeInstallPrompt('accepted')
    await waitFor(() => expect(screen.getByText('Install')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Install'))

    expect(event.prompt).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('Install Sherpa Sips')).not.toBeInTheDocument())
    expect(localStorage.getItem('sherpa-install-prompt-dismissed')).toBe('1')
  })

  it('does not show once dismissed, including after remount', async () => {
    render(<InstallPromptBanner />)
    fireBeforeInstallPrompt()
    await waitFor(() => expect(screen.getByLabelText('Dismiss')).toBeInTheDocument())

    await userEvent.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByText('Install Sherpa Sips')).not.toBeInTheDocument()

    render(<InstallPromptBanner />)
    fireBeforeInstallPrompt()
    await waitFor(() => {
      expect(screen.queryByText('Install Sherpa Sips')).not.toBeInTheDocument()
    })
  })
})

// ── Hydration ────────────────────────────────────────────────────────────────
//
// The banner threw "Hydration failed because the server rendered HTML didn't
// match the client" in the real app, and none of the tests above could see it:
// they all use `render()`, which is client-only, so the server render was never
// exercised.
//
// The mechanism was the store. install-prompt-store.ts attaches its
// 'beforeinstallprompt' listener at module scope from the root layout — on
// purpose, so the event isn't missed — which means it routinely fires before
// React hydrates. The client then had `canInstall === true` on its very first
// pass while the server's HTML had no banner at all.
describe('InstallPromptBanner — server rendering', () => {
  it('renders nothing on the server even when the store says installable', async () => {
    const { renderToString } = await import('react-dom/server')
    fireBeforeInstallPrompt()

    // The server cannot know what a browser will say about installability, so
    // the only HTML it can correctly emit is none. This is what regressed: a
    // `useState(getCanInstall)` initialiser happily returned true here.
    expect(renderToString(<InstallPromptBanner />)).toBe('')
  })

  it('renders nothing on the server regardless of a stored dismissal', async () => {
    const { renderToString } = await import('react-dom/server')
    localStorage.setItem('sherpa-install-prompt-dismissed', '1')
    fireBeforeInstallPrompt()

    expect(renderToString(<InstallPromptBanner />)).toBe('')
  })

  it('hydrates the server HTML without a mismatch, then reveals the banner', async () => {
    const { renderToString } = await import('react-dom/server')
    const { hydrateRoot } = await import('react-dom/client')
    const { act } = await import('react')

    fireBeforeInstallPrompt()

    const container = document.createElement('div')
    container.innerHTML = renderToString(<InstallPromptBanner />)
    document.body.appendChild(container)

    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args.map(String).join(' '))
    })

    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <InstallPromptBanner />)
    })

    expect(errors.filter(e => /hydrat/i.test(e))).toEqual([])
    spy.mockRestore()

    // And the point of the exercise: it does appear, one render later.
    expect(container.textContent).toContain('Install Sherpa Sips')

    await act(async () => root!.unmount())
    container.remove()
  })
})
