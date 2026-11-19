import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";

/** The header's account link: "Your account" when signed in, "Sign in" otherwise. */
export async function HeaderAccount() {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  return (
    <Link href={user ? "/account" : "/login"} className="text-sm underline underline-offset-4">
      {user ? "Your account" : "Sign in"}
    </Link>
  );
}
