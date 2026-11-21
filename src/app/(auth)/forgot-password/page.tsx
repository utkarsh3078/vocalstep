import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { NotConfigured } from "@/components/auth/not-configured";
import { isSupabaseConfigured } from "@/lib/env/public";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password."
      intro="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <NotConfigured />}
    </AuthShell>
  );
}
