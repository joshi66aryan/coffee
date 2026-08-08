'use client'

import { useEffect, useState } from 'react'
import { getCanInstall, subscribe, promptInstall } from '@/lib/pwa/install-prompt-store'

// Safari/iOS never fires 'beforeinstallprompt' at all (no native prompt API
// there — install is manual, via the share sheet), so canInstall simply
// stays false on those browsers.
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(getCanInstall)

  useEffect(() => subscribe(setCanInstall), [])

  return { canInstall, promptInstall }
}
