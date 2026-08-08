'use client'

import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/lib/pwa/use-install-prompt'

export function InstallAppRow() {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <button
      onClick={() => promptInstall()}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      <Download className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="flex-1 text-sm font-medium text-gray-900">Install App</span>
    </button>
  )
}
