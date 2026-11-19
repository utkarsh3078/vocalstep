import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

import { loginHref } from "./redirect";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in user for this request, or null. The token is verified, so the
 * id can be trusted. Never take a user id from the browser instead.
 * Cached per request, so calling it from several components costs one check.
 *
 * Call this (or requireUser) before any other Supabase read in a component:
 * it marks the render as request-time, which Supabase needs because it checks
 * token expiry against the clock.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;

  // Supabase reads the clock (Date.now) to check whether the token has
  // expired. With Cache Components, Next.js may prerender this component with
  // cookies already available but the clock not yet allowed, and reports an
  // error in development. Waiting for the real request first avoids that.
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/**
 * The signed-in user, or a redirect to the login page that returns to
 * `currentPath` afterwards. Every protected page calls this itself; the proxy's
 * redirect is only a fast first check.
 */
export async function requireUser(currentPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref(currentPath));
  return user;
}
