import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { HeaderAccount } from "@/components/header-account";
import { site } from "@/config/site";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900">
        <header className="border-b border-neutral-200">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
            <Link href="/" className="text-lg font-semibold">
              {site.name}
            </Link>
            <nav aria-label="Main" className="flex gap-4 text-sm">
              <Link
                href="/#how-it-works"
                className="hover:underline hover:underline-offset-4"
              >
                How it works
              </Link>
              <Link
                href="/#features"
                className="hover:underline hover:underline-offset-4"
              >
                Features
              </Link>
            </nav>
            <div className="ml-auto">
              {/* Reads the session, so it streams in without holding up the page. */}
              <Suspense fallback={null}>
                <HeaderAccount />
              </Suspense>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
          {children}
        </main>

        <footer className="border-t border-neutral-200">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-neutral-600">
            <nav aria-label="Site">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="underline underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-4">
              © {site.launchYear} {site.name} · {site.tagline}
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
