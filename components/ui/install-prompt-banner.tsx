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
    <div className="mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
      <Download className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Install Sherpa Sips</p>
        <p className="text-xs text-gray-500 mt-0.5">Add it to your home screen for quick, full-screen access.</p>
      </div>
      <button
        onClick={install}
        className="shrink-0 bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-amber-700 active:scale-95 transition-all"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
