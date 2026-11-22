import { ArrowRight, Check, KeyRound, LayoutDashboard, LogOut, Mail, UserRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

const card = "rounded-card bg-surface shadow-card";

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <section data-layout="wide" className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6 sm:pt-8">
      <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
        Your account. <span className="text-faint">Profile and sign-in.</span>
      </h1>
      <Suspense
        fallback={
          <p role="status" className={`${card} mt-8 p-7 text-muted`}>
            Loading your account…
          </p>
        }
      >
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
    <div className="mt-8 space-y-6">
      {firstParam(updated) === "password" && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-mint-200 bg-mint-50 px-4 py-3 text-mint-700"
        >
          <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
          Your password has been changed.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          We couldn&apos;t load your profile just now. Please refresh the page.
        </p>
      )}

      <section aria-labelledby="profile" className={`${card} p-6 sm:p-8`}>
        <h2 id="profile" className="text-lg font-semibold tracking-tight">
          Profile
        </h2>
        <dl className="mt-4 divide-y divide-line">
          <Row icon={UserRound} label="Name">
            {profile?.full_name ?? <span className="text-muted">Not set</span>}
          </Row>
          <Row icon={Mail} label="Email">
            {user.email ?? <span className="text-muted">Not available</span>}
          </Row>
        </dl>
      </section>

      <section aria-labelledby="password" className={`${card} flex flex-wrap items-center gap-4 p-6 sm:p-8`}>
        <IconWell icon={KeyRound} />
        <div className="min-w-0 flex-1">
          <h2 id="password" className="text-lg font-semibold tracking-tight">
            Password
          </h2>
          <p className="mt-0.5 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-faint"
        >
          Change password
        </Link>
      </section>

      <Link
        href="/dashboard"
        className={`${card} group flex items-center gap-4 p-6 transition-shadow hover:shadow-lift sm:p-8`}
      >
        <IconWell icon={LayoutDashboard} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold tracking-tight">Your practice</span>
          <span className="mt-0.5 block text-sm text-muted">
            Your streaks, minutes and recent practice are on your dashboard.
          </span>
        </span>
        <ArrowRight aria-hidden="true" className="size-5 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>

      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

function Row({ icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-2 last:pb-0">
      <IconWell icon={icon} />
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-medium break-all">{children}</dd>
      </div>
    </div>
  );
}

function IconWell({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-well">
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}
