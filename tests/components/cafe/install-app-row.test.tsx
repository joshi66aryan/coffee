import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallAppRow } from '@/components/cafe/install-app-row'
import { InstallPromptBanner } from '@/components/ui/install-prompt-banner'
import { __resetInstallPromptStoreForTests } from '@/lib/pwa/install-prompt-store'

type FakeBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as FakeBeforeInstallPromptEvent
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome: 'accepted' })
  window.dispatchEvent(event)
  return event
}

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

function pretendToBe(userAgent: string, { standalone = false } = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  Object.defineProperty(navigator, 'standalone', {
    value: standalone,
    configurable: true,
  })
}

beforeEach(() => {
  __resetInstallPromptStoreForTests()
  // jsdom has no matchMedia; an installed PWA is the only thing it would
  // report, and these tests say so through navigator.standalone instead.
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'standalone')
})

describe('InstallAppRow', () => {
  it('renders nothing when the browser has not signaled installability', () => {
    const { container } = render(<InstallAppRow />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an Install App row once beforeinstallprompt fires, and prompts on click', async () => {
    render(<InstallAppRow />)
    const event = fireBeforeInstallPrompt()

    const row = await screen.findByRole('button', { name: 'Install App' })
    await userEvent.click(row)

    await waitFor(() => expect(event.prompt).toHaveBeenCalled())
  })

  // The reason this row exists on iOS at all. Apple requires every browser on
  // the platform to use Safari's engine, none of which fire the install event,
  // so returning null there left iPhone cafés with no way to find out the app
  // could be installed — which is how it was reported.
  it('explains the Share-sheet route on an iPhone, where no install event ever fires', async () => {
    pretendToBe(IPHONE_UA)

    render(<InstallAppRow />)

    expect(await screen.findByText('Install App')).toBeInTheDocument()
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
    // Nothing to press: there is no prompt behind it on this platform.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says nothing on an iPhone that already installed the app', () => {
    pretendToBe(IPHONE_UA, { standalone: true })

    const { container } = render(<InstallAppRow />)
    expect(container).toBeEmptyDOMElement()
  })

  it('still shows once an earlier-mounted component (e.g. the home banner) already captured the event', async () => {
    // Simulates: event fires while the home page's banner is mounted, user
    // navigates client-side to Settings (banner unmounts, row mounts fresh)
    // — the row must still see it, since the browser won't fire the
    // one-time event a second time.
    render(<InstallPromptBanner />)
    fireBeforeInstallPrompt()
    await waitFor(() => expect(screen.getByText('Install Sherpa Sips')).toBeInTheDocument())
    cleanup()

    render(<InstallAppRow />)
    expect(await screen.findByRole('button', { name: 'Install App' })).toBeInTheDocument()
  })
})
