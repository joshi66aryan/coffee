'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt'

const DISMISS_KEY = 'sherpa-install-prompt-dismissed'

export function InstallPromptBanner() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window === 'undefined' ? true : localStorage.getItem(DISMISS_KEY) === '1'
  )
  const { canInstall, promptInstall } = useInstallPrompt()

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
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
