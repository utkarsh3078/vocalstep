import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env/public";

import type { Database } from "./database.types";

/**
 * A Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user (from the session cookies). Row Level Security
 * decides what it can read and write.
 *
 * Create one per request; never share it between requests.
 */
export async function createClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. That is fine: the proxy
            // refreshes the session on every request that carries one.
          }
        },
      },
    },
  );
}
