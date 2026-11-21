import { BookMarked, Flame, Gift, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo";
import { practice } from "@/config/practice";

/**
 * The layout of the sign-in pages: a card with a two-tone heading, and on
 * sign-in and sign-up a panel saying what an account gives you (from config).
 */
export function AuthShell({
  title,
  faint,
  intro,
  aside = false,
  footer,
  children,
}: {
  title: string;
  faint?: string;
  intro?: ReactNode;
  /** Show the panel about what an account gives you (wide screens only). */
  aside?: boolean;
  /** A line under the card's content, such as "New to VocalStep? Create an account". */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-layout="wide" className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 sm:pt-10">
      <div
        className={
          aside
            ? "grid gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center lg:gap-16"
            : "mx-auto max-w-md"
        }
      >
        <div className="rounded-card bg-surface p-7 shadow-card sm:p-9">
          <LogoMark className="size-10" />
          <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-[-0.03em]">
            {title} {faint && <span className="text-faint">{faint}</span>}
          </h1>
          {intro && <p className="mt-3 text-muted">{intro}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
        </div>

        {aside && <AccountBenefits />}
      </div>
    </section>
  );
}

const BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Gift,
    title: `${practice.limits.freeSpeeches} free speeches`,
    text: "On any topic you choose, written to the length you pick.",
  },
  {
    icon: BookMarked,
    title: "Your place, on any device",
    text: "Stop mid-speech and carry on later, down to the word.",
  },
  {
    icon: Flame,
    title: "Streaks and history",
    text: `${practice.tracking.streakMinMinutes} minutes a day keeps your streak going.`,
  },
];

function AccountBenefits() {
  return (
    <aside aria-labelledby="account-benefits" className="hidden lg:block">
      <h2 id="account-benefits" className="text-3xl leading-tight font-semibold tracking-[-0.03em]">
        Practise speaking <span className="text-faint">a little every day.</span>
      </h2>
      <ul className="mt-8 space-y-6">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-card">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="font-semibold tracking-tight">{title}</p>
              <p className="mt-0.5 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">
        Not ready for an account?{" "}
        <Link href="/#samples" className="font-medium text-ink underline underline-offset-4">
          Try a sample speech
        </Link>
      </p>
    </aside>
  );
}
