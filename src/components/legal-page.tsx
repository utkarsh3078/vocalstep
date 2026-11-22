import Link from "next/link";
import type { ReactNode } from "react";

const PAGES = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

/**
 * The layout of the About, Privacy, Terms and Contact pages: a small menu
 * between them, and the text in a reading card.
 */
export function LegalPage({
  title,
  path,
  intro,
  draft = false,
  children,
}: {
  title: string;
  /** This page's address, to mark it in the menu. */
  path: string;
  intro?: string;
  /** Shows a note that the page has not been finalised yet. */
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <div data-layout="wide" className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 sm:pt-8">
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <nav aria-label="About VocalStep" className="lg:sticky lg:top-6">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {PAGES.map((page) => {
              const active = page.href === path;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-4 py-2 text-sm transition-colors ${
                      active ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {page.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <article className="rounded-card bg-surface p-7 shadow-card sm:p-12">
          <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">{title}</h1>
          {intro && <p className="mt-3 max-w-[60ch] text-lg text-muted">{intro}</p>}
          {draft && (
            <p className="mt-6 rounded-2xl border border-peach-200 bg-peach-50 px-4 py-3 text-sm text-peach-700">
              This page is a draft and will be reviewed and completed.
            </p>
          )}
          <div className="mt-8 max-w-[68ch] space-y-4 leading-7 text-ink-soft [&_a]:font-medium [&_a]:text-ink [&_h2]:pt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:pl-1 [&_li]:marker:text-mint-700 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}
