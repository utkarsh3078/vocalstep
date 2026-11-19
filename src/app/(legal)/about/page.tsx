import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name} is a personal speaking-practice tool: choose a topic, get a script, and read it aloud every day.`,
};

// Owner: replace or extend this text as you like.
export default function AboutPage() {
  return (
    <LegalPage title={`About ${site.name}`}>
      <p>
        {site.name} is a personal speaking-practice tool. You choose a topic, get a natural,
        conversational script of the length you want, and read it aloud in a full-screen
        teleprompter.
      </p>
      <p>
        The goal is a daily speaking habit: to get comfortable speaking continuously, hesitate
        less, express your thoughts better, and become at ease speaking about many different
        topics.
      </p>
      <p>
        It is not an interview-preparation, debate or speech-writing service. It is simply a place
        to practise speaking, a few minutes at a time.
      </p>
      <p>
        <Link href="/#samples" className="underline underline-offset-4">
          Try a sample speech
        </Link>{" "}
        — no account needed.
      </p>
    </LegalPage>
  );
}
