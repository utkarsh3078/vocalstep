import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

const EMAIL_LINK_TYPES: readonly EmailOtpType[] = ["email", "signup", "recovery", "invite", "email_change"];

function isEmailLinkType(value: string | null): value is EmailOtpType {
  return EMAIL_LINK_TYPES.includes(value as EmailOtpType);
}

/**
 * The link in sign-up and password-reset emails. Verifies the token, which
 * signs the user in, then sends them on. Works in any browser, unlike a code
 * exchange, which needs the browser that asked for the email.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && isEmailLinkType(type) && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const next = safeNextPath(searchParams.get("next"));
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
