import { Mail } from "lucide-react";
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to get in touch with ${site.name}.`,
};

// The address comes from `contactEmail` in src/config/site.ts.
export default function ContactPage() {
  return (
    <LegalPage title="Contact" path="/contact" intro="Questions, feedback or help with your account.">
      {site.contactEmail ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-canvas p-5">
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-surface">
            <Mail className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Email us at</p>
            <p className="font-medium break-all text-ink">{site.contactEmail}</p>
          </div>
          <a
            href={`mailto:${site.contactEmail}`}
            className="inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-on-ink! transition-colors hover:bg-ink-soft"
          >
            Send an email
          </a>
        </div>
      ) : (
        <p>Contact details are coming soon.</p>
      )}
    </LegalPage>
  );
}
