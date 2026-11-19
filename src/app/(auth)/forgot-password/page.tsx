import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { NotConfigured } from "@/components/auth/not-configured";
import { isSupabaseConfigured } from "@/lib/env/public";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-neutral-700">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <div className="mt-6">{isSupabaseConfigured() ? <ForgotPasswordForm /> : <NotConfigured />}</div>
      <p className="mt-8">
        <Link href="/login" className="underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
