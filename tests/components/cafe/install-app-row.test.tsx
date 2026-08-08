import { describe, it, expect, vi, beforeEach } from 'vitest'
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

beforeEach(() => {
  __resetInstallPromptStoreForTests()
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
