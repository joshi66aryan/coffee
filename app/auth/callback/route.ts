import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePostAuthRedirect } from '@/lib/cafe/auth-redirect'
import logger from '@/lib/logger'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { redirect } = await resolvePostAuthRedirect(data.user.id, supabase)
      return NextResponse.redirect(`${origin}${redirect}`)
    }

    logger.error('OAuth code exchange failed', { msg: error?.message })
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
