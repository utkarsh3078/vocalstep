import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

/** Reached from the reset email, whose link signs the user in first. */
export default function ResetPasswordPage() {
  return (
    <section className="mx-auto max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <div className="mt-6">
        <Suspense fallback={<p role="status">Loading…</p>}>
          <ResetPassword />
        </Suspense>
      </div>
    </section>
  );
}

async function ResetPassword() {
  await requireUser("/reset-password");
  return <ResetPasswordForm />;
}
