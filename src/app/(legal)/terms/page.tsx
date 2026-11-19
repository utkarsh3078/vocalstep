import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { practice } from "@/config/practice";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms for using ${site.name}.`,
};

// Owner: a plain-language draft. Review it, then remove `draft` from <LegalPage>.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" draft>
      <p>By using {site.name}, you agree to these terms.</p>

      <h2>What the service is for</h2>
      <p>
        {site.name} is for personal speaking practice. Scripts are written to be read aloud for
        practice, not as advice of any kind.
      </p>

      <h2>AI-written scripts</h2>
      <p>
        Scripts are written by an AI. They may contain mistakes, so please don&apos;t rely on them
        for facts. Topics in some areas, such as politics, religion and anything harmful, are
        declined.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password to yourself; you are responsible for activity on your account.</li>
        <li>
          Each account includes {practice.limits.freeSpeeches} free speeches. Daily limits apply to
          keep the service available for everyone.
        </li>
        <li>Don&apos;t try to get around these limits or misuse the service.</li>
      </ul>

      <h2>Changes</h2>
      <p>
        The service is offered as it is and may change. If these terms change, this page will be
        updated.
      </p>

      <p>
        Questions?{" "}
        <Link href="/contact" className="underline underline-offset-4">
          Contact us
        </Link>
        .
      </p>
    </LegalPage>
  );
}
