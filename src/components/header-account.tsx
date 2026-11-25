import Link from "next/link";

import { AccountTheme } from "@/components/account-theme";
import { NavLink } from "@/components/nav-link";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { getSavedTheme } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const pill = "rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink";

/**
 * The header's account links: the signed-in pages; Sign in and Get started
 * otherwise. For a signed-in user it also keeps the site's theme in step with
 * the one saved to their account.
 */
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
          className="rounded-full bg-ink px-4 py-2 font-medium text-on-ink transition-colors hover:bg-ink-soft"
        >
          Get started
        </Link>
      </nav>
    );
  }

  const savedTheme = await getSavedTheme(await createClient(), user.id);

  return (
    <nav aria-label="Your account" className="flex flex-wrap items-center gap-1 text-sm">
      {/* Applies the theme saved to the account, and saves new choices. */}
      <AccountTheme saved={savedTheme} />
      <NavLink href="/dashboard">Dashboard</NavLink>
      {/* A speech's own pages, and the library, belong with the list of speeches. */}
      <NavLink href="/history" match={["/history", "/speeches", "/library"]}>
        Your speeches
      </NavLink>
      <NavLink href="/create">Create</NavLink>
      <NavLink href="/account">Account</NavLink>
    </nav>
  );
}
