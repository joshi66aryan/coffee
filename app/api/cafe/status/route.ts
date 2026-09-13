import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/user'
import { consumeRateLimit } from '@/lib/rate-limit'

// Polled by the approval watcher while a café waits for approval, so the auth
// check here runs often — it reads the access token locally rather than
// calling the Auth API. See lib/supabase/user.ts.
export async function GET() {
  const { user } = await getCachedUser()

  if (!user) {
    return NextResponse.json({ status: null }, { status: 401 })
  }

  // This is the only route in the app a client polls on a timer, which makes it
  // the one an authenticated caller can turn into a database query loop for
  // free. The ceiling sits far above the watcher's own interval, so a real
  // pending café never reaches it.
  const limit = await consumeRateLimit('cafeStatus', user.id)
  if (!limit.allowed) {
    return NextResponse.json(
      { status: null, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('cafes')
    .select('status')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ status: data?.status ?? null })
}
