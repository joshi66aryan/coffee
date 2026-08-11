'use client'

import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt'

export function InstallAppRow() {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <button
      onClick={() => promptInstall()}
      className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-cream-100"
    >
      <Download className="h-4 w-4 shrink-0 text-brand-600" />
      <span className="flex-1 font-display text-base leading-none text-brand-900">Install App</span>
    </button>
  )
}
