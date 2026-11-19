import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${site.name} stores about you and how it is used.`,
};

// Owner: a factual draft of how the app handles data today. Review it (ideally
// with someone qualified), then remove `draft` from <LegalPage>.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" draft>
      <p>
        This page explains what {site.name} stores about you and why. In short: only what is needed
        to run your account and your practice, and no advertising or tracking.
      </p>

      <h2>Without an account</h2>
      <p>
        You can practise the sample speeches without signing up. Your reading position and display
        settings are saved in your own browser (local storage) and never sent to us.
      </p>

      <h2>With an account</h2>
      <ul>
        <li>Your email address and, if you give it, your name.</li>
        <li>
          Your password, which is handled by our sign-in provider and stored only in a scrambled
          (hashed) form.
        </li>
        <li>
          The speeches you create: the topic, the text, the length, language and difficulty you
          chose, and when they were made.
        </li>
        <li>Your last-used language and difficulty, to pre-fill the next speech.</li>
      </ul>

      <h2>How speeches are written</h2>
      <p>
        To write a speech, your topic and choices are sent to Google&apos;s Gemini AI service.
        Google may use these prompts and the replies to improve its products. Please don&apos;t put
        personal or sensitive information in a topic.
      </p>

      <h2>Where your data is kept</h2>
      <p>
        Accounts and speeches are stored with Supabase, our database and sign-in provider. The site
        is hosted by Vercel.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies only to keep you signed in. There are no advertising or analytics cookies.
      </p>

      <h2>Your choices</h2>
      <p>
        To ask about your data or to have your account deleted, please{" "}
        <Link href="/contact" className="underline underline-offset-4">
          contact us
        </Link>
        .
      </p>
    </LegalPage>
  );
}
