import Link from "next/link";

import type { SpeechSummary } from "@/lib/speech/data";

const STATUS_LABELS: Record<SpeechSummary["status"], string> = {
  ready: "Ready",
  generating: "Being written",
  failed: "Couldn't be written",
};

/** The user's recent speeches, as compact rows. Dates are shown in the user's own time zone. */
export function SpeechList({
  speeches,
  timezone,
}: {
  speeches: SpeechSummary[] | null;
  timezone: string;
}) {
  if (speeches === null) {
    return (
      <p role="alert" className="text-sm text-red-800">
        We couldn&apos;t load your speeches. Please refresh the page.
      </p>
    );
  }
  if (speeches.length === 0) {
    return <p className="text-sm text-muted">You haven&apos;t written any speeches yet.</p>;
  }

  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: timezone });

  return (
    <ul className="divide-y divide-line">
      {speeches.map((speech) => (
        <li key={speech.id} className="py-3 first:pt-0 last:pb-0">
          <Link href={`/speeches/${speech.id}`} className="font-medium underline-offset-4 hover:underline">
            {speech.title || speech.topic}
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            {speech.status === "ready" ? `${speech.wordCount} words` : STATUS_LABELS[speech.status]} ·{" "}
            {speech.targetMinutes} min · {date.format(new Date(speech.createdAt))}
          </p>
        </li>
      ))}
    </ul>
  );
}
