import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";

/** The header's account links: Create and "Your account" when signed in, "Sign in" otherwise. */
export async function HeaderAccount() {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="text-sm underline underline-offset-4">
        Sign in
      </Link>
    );
  }

  return (
    <nav aria-label="Your account" className="flex items-center gap-4 text-sm">
      <Link href="/create" className="underline underline-offset-4">
        Create a speech
      </Link>
      <Link href="/account" className="underline underline-offset-4">
        Your account
      </Link>
    </nav>
  );
}
