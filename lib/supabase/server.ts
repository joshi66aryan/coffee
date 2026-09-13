import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies will be set by middleware
          }
        },
      },
    }
  );
}

/**
 * A client that authenticates but never writes a session.
 *
 * Used to check a password the caller has just typed — re-authentication before
 * a password change. The ordinary server client would treat that check as a
 * sign-in and overwrite the caller's session cookies with the tokens it minted;
 * with no-op cookie handlers, `signInWithPassword` becomes what it is being
 * used as here: a yes/no on a credential.
 */
export function createVerificationClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
