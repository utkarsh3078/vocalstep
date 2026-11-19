import Link from "next/link";

import { practice } from "@/config/practice";
import { getAllSamples } from "@/lib/samples";

/** "5, 10 or 15", from the configured durations. */
const durationList = practice.durations.join(", ").replace(/, (\d+)$/, " or $1");
const languageList = Object.values(practice.languages)
  .map((language) => language.label)
  .join(" and ");

const STEPS = [
  {
    title: "Choose your topic",
    text: "Type anything you'd like to speak about or learn about, or pick one of the examples.",
  },
  {
    title: "Generate your script",
    text: `Pick ${durationList} minutes. A natural, conversational speech of that length is written for you.`,
  },
  {
    title: "Start speaking",
    text: "Open the teleprompter and read aloud. The word you're on lights up as you go.",
  },
];

/** Only what the app does today. Planned features are listed separately below. */
const FEATURES = [
  {
    title: "AI-written scripts",
    text: `Speeches on topics you choose, with ${practice.limits.freeSpeeches} free with an account. Topics are checked so scripts stay suitable for practice.`,
  },
  {
    title: `${durationList}-minute sessions`,
    text: "Short sessions that fit into a busy day, so practice becomes a habit.",
  },
  {
    title: "Distraction-free teleprompter",
    text: "Full screen, large text, and the current word highlighted as it scrolls.",
  },
  {
    title: "Adjustable speed",
    text: "Set your own pace in words per minute and change it any time, even mid-speech.",
  },
  {
    title: `${languageList}`,
    text: "Practise in English, or in Hindi written in natural Devanagari.",
  },
  {
    title: "Pick up where you left off",
    text: "Your place in each speech is saved on this device, down to the word.",
  },
];

export default function HomePage() {
  const samples = getAllSamples();

  return (
    <>
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your Voice Gets Stronger Every Time You Speak.
        </h1>
        <p className="mt-4 text-lg text-neutral-700">
          Choose any topic, generate your speaking script, and practise for {durationList} minutes
          with your personal AI-powered teleprompter.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#samples"
            className="rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700"
          >
            Start Speaking
          </a>
          <a
            href="#how-it-works"
            className="rounded-md border border-neutral-900 px-5 py-3 font-medium hover:bg-neutral-100"
          >
            How it works
          </a>
        </div>
        <p className="mt-3 text-sm text-neutral-600">
          No account needed to try a sample speech.
        </p>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="mt-16 scroll-mt-6">
        <h2 id="how-heading" className="text-2xl font-semibold">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-md border border-neutral-300 p-4">
              <p className="text-sm font-medium text-neutral-600">Step {index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-neutral-700">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" aria-labelledby="features-heading" className="mt-16 scroll-mt-6">
        <h2 id="features-heading" className="text-2xl font-semibold">
          Features
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1 text-neutral-700">{feature.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-neutral-600">
          Coming soon: daily practice streaks and your practice history.
        </p>
      </section>

      <section aria-labelledby="create-heading" className="mt-16">
        <h2 id="create-heading" className="text-2xl font-semibold">
          Speak about your own topic
        </h2>
        <p className="mt-2 text-neutral-700">
          Create a free account and we&apos;ll write {practice.limits.freeSpeeches} speeches on topics
          you choose.
        </p>
        <Link
          href="/create"
          className="mt-4 inline-block rounded-md border border-neutral-900 px-5 py-3 font-medium hover:bg-neutral-100"
        >
          Create a speech
        </Link>
      </section>

      <section id="samples" aria-labelledby="samples-heading" className="mt-16 scroll-mt-6">
        <h2 id="samples-heading" className="text-2xl font-semibold">
          Sample speeches
        </h2>
        <p className="mt-2 text-neutral-700">No account needed. Choose one and read it aloud.</p>

        {samples.length === 0 ? (
          <p className="mt-6 text-neutral-600">There are no sample speeches yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {samples.map((sample) => (
              <li key={sample.slug} className="rounded-md border border-neutral-300 p-4">
                <h3 className="text-lg font-semibold">
                  <Link href={`/samples/${sample.slug}`} className="underline underline-offset-4">
                    {sample.title}
                  </Link>
                </h3>
                <p className="mt-1 text-neutral-700">{sample.summary}</p>
                <p className="mt-2 text-sm text-neutral-600">
                  {sample.minutes} min · {sample.speech.wordCount} words
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
