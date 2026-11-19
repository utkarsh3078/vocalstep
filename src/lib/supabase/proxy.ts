import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv, isSupabaseConfigured } from "@/lib/env/public";

/** True when the request carries Supabase auth cookies (names start with "sb-"). */
function hasAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
}

/**
 * Refreshes the user's session, if there is one, and reports whether a user
 * is signed in. Returns the response to send on (it may carry new cookies).
 *
 * Visitors without auth cookies, and every visitor when Supabase is not yet
 * configured, skip the check entirely, so public pages stay fast and keep
 * working without Supabase.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; signedIn: boolean }> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured() || !hasAuthCookies(request)) {
    return { response, signedIn: false };
  }

  const env = getPublicEnv();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Stops a CDN from caching a response that sets session cookies.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Do not run other code between creating the client and this call: it is
  // what refreshes an expired session. getClaims() verifies the token.
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.sub) };
}

/** A redirect that keeps any session cookies the refresh just set. */
export function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
