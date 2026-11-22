import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { HeaderAccount } from "@/components/header-account";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { site } from "@/config/site";
import { themeScript } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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

const navLink =
  "rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-ink";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Smooth scrolling for in-page links, but instant jumps between pages.
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
      // The theme script below adds data-theme before React loads.
      suppressHydrationWarning
    >
      <head>
        {/* Sets the light or dark theme before the first paint (src/lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <header>
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 rounded-lg text-lg font-semibold tracking-tight">
              <LogoMark />
              {site.name}
            </Link>
            <nav aria-label="Main" className="flex gap-1 text-sm">
              <Link href="/#how-it-works" className={navLink}>
                How it works
              </Link>
              <Link href="/#features" className={navLink}>
                Features
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-1">
              {/* Reads the session, so it streams in without holding up the page. */}
              <Suspense fallback={null}>
                <HeaderAccount />
              </Suspense>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Pages sit in a narrow column. A page that brings its own full-width
            layout marks its outer element data-layout="wide" (the home page). */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 has-[>[data-layout=wide]]:max-w-none has-[>[data-layout=wide]]:p-0">
          {children}
        </main>

        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <p className="flex items-center gap-2 font-semibold text-ink">
                <LogoMark className="size-6" />
                {site.name}
              </p>
              <p className="mt-2 text-muted">{site.tagline}</p>
            </div>
            <div className="sm:text-right">
              <nav aria-label="Site">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
                  {FOOTER_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-muted hover:text-ink hover:underline hover:underline-offset-4">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <p className="mt-4 text-muted">
                © {site.launchYear} {site.name}
              </p>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
