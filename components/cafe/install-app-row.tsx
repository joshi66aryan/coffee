'use client'

import { Download, Share } from 'lucide-react'
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt'

export function InstallAppRow() {
  const { canInstall, needsManualInstall, promptInstall } = useInstallPrompt()

  if (canInstall) {
    return (
      <button
        onClick={() => promptInstall()}
        className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-cream-100"
      >
        <Download className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span className="flex-1 font-display text-base leading-none text-brand-900">Install App</span>
      </button>
    )
  }

  // iPhone and iPad: there is no prompt to fire, so the row describes the
  // Share-sheet route instead of disappearing. Hiding it is what left every
  // café on an iPhone with no way to discover the app could be installed.
  if (needsManualInstall) {
    return (
      <div className="flex items-start gap-3.5 px-4 py-4">
        <Share className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-none text-brand-900">Install App</p>
          <p className="mt-2 text-xs text-gray-500">
            Tap the Share button in the browser bar, then choose “Add to Home Screen”.
          </p>
        </div>
      </div>
    )
  }

  return null
}
