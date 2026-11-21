import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";

const pill = "rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink";

/** The header's account links: the signed-in pages; Sign in and Get started otherwise. */
export async function HeaderAccount() {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) {
    return (
      <nav aria-label="Account" className="flex items-center gap-2 text-sm">
        <Link href="/login" className={pill}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-ink px-4 py-2 font-medium text-white transition-colors hover:bg-ink-soft"
        >
          Get started
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label="Your account" className="flex flex-wrap items-center gap-1 text-sm">
      <Link href="/dashboard" className={pill}>
        Dashboard
      </Link>
      <Link href="/history" className={pill}>
        Your speeches
      </Link>
      <Link href="/create" className={pill}>
        Create
      </Link>
      <Link href="/account" className={pill}>
        Account
      </Link>
    </nav>
  );
}
