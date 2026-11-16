import Link from "next/link";

import { getAllSamples } from "@/lib/samples";

export default function HomePage() {
  const samples = getAllSamples();

  return (
    <>
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your Voice Gets Stronger Every Time You Speak.
        </h1>
        <p className="mt-4 text-lg text-neutral-700">
          Pick a short script, read it aloud, and build a daily speaking habit. Start with
          one of the sample speeches below.
        </p>
        <a
          href="#samples"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700"
        >
          Start Speaking
        </a>
      </section>

      <section id="samples" aria-labelledby="samples-heading" className="mt-14 scroll-mt-6">
        <h2 id="samples-heading" className="text-2xl font-semibold">
          Sample speeches
        </h2>
        <p className="mt-2 text-neutral-700">
          No account needed. Choose one and read it aloud.
        </p>

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
