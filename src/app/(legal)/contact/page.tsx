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
    <LegalPage title="Contact">
      {site.contactEmail ? (
        <p>
          For questions, feedback or help with your account, email{" "}
          <a href={`mailto:${site.contactEmail}`} className="underline underline-offset-4">
            {site.contactEmail}
          </a>
          .
        </p>
      ) : (
        <p>Contact details are coming soon.</p>
      )}
    </LegalPage>
  );
}
