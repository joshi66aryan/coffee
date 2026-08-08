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
