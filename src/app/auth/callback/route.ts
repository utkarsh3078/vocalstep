import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sign-in returns, and where Supabase's default email templates
 * point. Exchanges the one-time code for a session, then sends the user on.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = safeNextPath(searchParams.get("next"));
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
