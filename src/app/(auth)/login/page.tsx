import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { NotConfigured } from "@/components/auth/not-configured";
import { auth } from "@/config/auth";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to VocalStep to generate your own speaking practice scripts.",
};

/** Messages for `?error=` values set by the sign-in links and buttons. */
const NOTICES: Record<string, string> = {
  link: "That link has expired or was already used. Please ask for a new one.",
  google: "Google sign-in isn't available right now. Please use your email and password.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title="Sign in." faint="Welcome back." intro="Pick up where you left off." aside>
      <Suspense fallback={<p role="status" className="text-muted">Loading…</p>}>
        <Login searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const next = safeNextPath(firstParam(params.next));
  if (await getCurrentUser()) redirect(next);

  const error = firstParam(params.error);
  const notice = error && Object.hasOwn(NOTICES, error) ? NOTICES[error] : undefined;
  const signupHref = next === auth.defaultRedirect ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <>
      <LoginForm next={next} notice={notice} />
      <GoogleButton next={next} />
      <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">
        New to VocalStep?{" "}
        <Link href={signupHref} className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
