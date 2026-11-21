import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

/** Reached from the reset email, whose link signs the user in first. */
export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password." intro="The link in your email has signed you in. Choose a new password to finish.">
      <Suspense fallback={<p role="status" className="text-muted">Loading…</p>}>
        <ResetPassword />
      </Suspense>
    </AuthShell>
  );
}

async function ResetPassword() {
  await requireUser("/reset-password");
  return <ResetPasswordForm />;
}
