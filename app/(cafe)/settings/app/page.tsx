import { requireActiveCafe } from '@/lib/cafe/require-cafe'
import { Info } from 'lucide-react'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { PageMasthead } from '@/components/ui/page-masthead'
import { ListGroup } from '@/components/ui/list-group'
import { ContactSupportRow } from '@/components/cafe/contact-support-row'
import { InstallAppRow } from '@/components/cafe/install-app-row'

export const metadata = { title: 'App Settings — Sherpa Sips' }

export default async function AppSettingsPage() {
  await requireActiveCafe()

  return (
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <CafeHeader />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Preferences"
          title="App Settings"
          backHref="/profile"
          backLabel="Account"
        />

        <div className="space-y-5 pt-6">
          {/* Notifications are not repeated here — the switch lives on the
              Account page, which is the screen cafés actually open. */}
          <ListGroup>
            <InstallAppRow />
            <ContactSupportRow />
            <div className="flex items-center gap-3.5 px-4 py-4">
              <Info className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-base leading-none text-brand-900">About Sherpa Sips</p>
                <p className="mt-2 text-xs text-gray-400">Café ordering app · v0.1.0</p>
              </div>
            </div>
          </ListGroup>
        </div>
      </div>
    </main>
  )
}
