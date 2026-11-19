import type { ReactNode } from "react";

/** Plain, readable layout for the About, Privacy, Terms and Contact pages. */
export function LegalPage({
  title,
  draft = false,
  children,
}: {
  title: string;
  /** Shows a note that the page has not been finalised yet. */
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {draft && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          This page is a draft and will be reviewed and completed.
        </p>
      )}
      <div className="mt-6 space-y-4 leading-7 text-neutral-800 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}
