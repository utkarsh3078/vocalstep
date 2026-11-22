import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">
        This page doesn&apos;t exist. It may have been moved or the link may be wrong.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-4">
          Back to the home page
        </Link>
      </p>
    </section>
  );
}
