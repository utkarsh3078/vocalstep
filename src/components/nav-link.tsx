"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A header link that shows when you are on its page (a white pill, and
 * aria-current for screen readers). `match` lists the address prefixes that
 * count as its page; it defaults to `href`.
 */
export function NavLink({ href, match = [href], children }: { href: string; match?: string[]; children: ReactNode }) {
  const pathname = usePathname();
  const active = match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 transition-colors ${
        active ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
