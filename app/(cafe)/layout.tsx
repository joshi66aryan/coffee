import { BottomNav } from '@/components/cafe/bottom-nav'
import { SessionScope } from '@/components/session-scope'
import { getCachedUser } from '@/lib/supabase/user'

export default async function CafeLayout({ children }: { children: React.ReactNode }) {
  // Read from the access token's claims, so this costs no round trip and is
  // already resolved for the page rendering inside this layout.
  const { user } = await getCachedUser()

  return (
    <>
      {user && <SessionScope userId={user.id} />}
      {children}
      <BottomNav />
    </>
  )
}
