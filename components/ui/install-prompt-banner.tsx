'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt'
import { useStoredFlag } from '@/lib/ui/use-stored-flag'

const DISMISS_KEY = 'sherpa-install-prompt-dismissed'

export function InstallPromptBanner() {
  // Read through useStoredFlag rather than a `typeof window === 'undefined'`
  // branch in a useState initialiser. That branch is evaluated again on the
  // client during the hydration render, where `window` *is* defined — so it
  // read localStorage and could disagree with the HTML the server sent, which
  // is one half of the hydration mismatch this banner used to throw. (The other
  // half was canInstall; see lib/pwa/use-install-prompt.ts.) useStoredFlag
  // returns null until hydration is finished, matching the server.
  const storedDismissal = useStoredFlag(DISMISS_KEY)
  // Writing the key doesn't notify this tab's own reader, so the dismissal is
  // also tracked in state to hide the banner immediately.
  const [dismissedNow, setDismissedNow] = useState(false)
  const { canInstall, promptInstall } = useInstallPrompt()

  const dismissed = dismissedNow || storedDismissal === '1'

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
    setDismissedNow(true)
  }

  async function install() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') dismiss()
  }

  if (!canInstall || dismissed) return null

  return (
    <div className="flex items-center gap-3.5 border-b border-brand-300 bg-brand-50 px-4 py-3 sm:px-6">
      <Download className="h-4.5 w-4.5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-none text-brand-900">Install Sherpa Sips</p>
        <p className="mt-1.5 text-xs text-gray-500">
          Add it to your home screen for quick, full-screen access.
        </p>
      </div>
      <button onClick={install} className="btn btn-primary btn-sm shrink-0">
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-gray-400 transition-colors hover:text-brand-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
