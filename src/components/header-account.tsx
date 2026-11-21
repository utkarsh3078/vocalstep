import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";

/** The header's account links: the signed-in pages; Sign in and Get started otherwise. */
export async function HeaderAccount() {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) {
    return (
      <nav aria-label="Account" className="flex items-center gap-4 text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-700"
        >
          Get started
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label="Your account" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <Link href="/dashboard" className="underline underline-offset-4">
        Dashboard
      </Link>
      <Link href="/history" className="underline underline-offset-4">
        Your speeches
      </Link>
      <Link href="/create" className="underline underline-offset-4">
        Create
      </Link>
      <Link href="/account" className="underline underline-offset-4">
        Account
      </Link>
    </nav>
  );
}
