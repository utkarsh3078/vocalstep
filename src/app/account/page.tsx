import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
      <Suspense fallback={<p role="status" className="mt-6">Loading your account…</p>}>
        <Account searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Account({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const user = await requireUser("/account");
  const { updated } = await searchParams;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  // The page shows a short message; the server log says why.
  if (error) console.error("Could not load the profile:", error.code, error.message);

  return (
    <div className="mt-6 space-y-6">
      {firstParam(updated) === "password" && (
        <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
          Your password has been changed.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          We couldn&apos;t load your profile just now. Please refresh the page.
        </p>
      )}

      <dl className="space-y-3">
        <div>
          <dt className="text-sm text-neutral-600">Name</dt>
          <dd>{profile?.full_name ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Email</dt>
          <dd>{user.email ?? "Not available"}</dd>
        </div>
      </dl>

      <p className="text-neutral-700">
        Your streaks, minutes and recent practice are on your{" "}
        <Link href="/dashboard" className="underline underline-offset-4">
          dashboard
        </Link>
        .
      </p>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
