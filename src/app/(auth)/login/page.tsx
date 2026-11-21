import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
    <section className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <div className="mt-6">
        <Suspense fallback={<p role="status">Loading…</p>}>
          <Login searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
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
      <p className="mt-8 text-neutral-700">
        New to VocalStep?{" "}
        <Link href={signupHref} className="underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
