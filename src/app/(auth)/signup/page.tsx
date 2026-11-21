import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { NotConfigured } from "@/components/auth/not-configured";
import { SignupForm } from "@/components/auth/signup-form";
import { practice } from "@/config/practice";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Create an account",
  description: `Create a free VocalStep account and generate ${practice.limits.freeSpeeches} speaking practice scripts on topics you choose.`,
};

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthShell
      title="Create an account."
      faint="It's free."
      intro={`An account lets you generate ${practice.limits.freeSpeeches} free speeches on topics you choose.`}
      aside
    >
      <Suspense fallback={<p role="status" className="text-muted">Loading…</p>}>
        <Signup searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Signup({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const params = await searchParams;
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const next = safeNextPath(firstParam(params.next));
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <SignupForm next={next} />
      <GoogleButton next={next} />
      <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
