import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/user'

// Polled by the approval watcher while a café waits for approval, so the auth
// check here runs often — it reads the access token locally rather than
// calling the Auth API. See lib/supabase/user.ts.
export async function GET() {
  const { user } = await getCachedUser()

  if (!user) {
    return NextResponse.json({ status: null }, { status: 401 })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('cafes')
    .select('status')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ status: data?.status ?? null })
}
