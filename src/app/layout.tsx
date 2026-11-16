import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";

import { site } from "@/config/site";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900">
        <header className="border-b border-neutral-200">
          <div className="mx-auto flex w-full max-w-3xl items-center px-4 py-4">
            <Link href="/" className="text-lg font-semibold">
              {site.name}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>

        <footer className="border-t border-neutral-200">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-neutral-600">
            {site.name} · {site.tagline}
          </div>
        </footer>
      </body>
    </html>
  );
}
