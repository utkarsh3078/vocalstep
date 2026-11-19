import Link from "next/link";

import type { SpeechSummary } from "@/lib/speech/data";

const STATUS_LABELS: Record<SpeechSummary["status"], string> = {
  ready: "Ready",
  generating: "Being written",
  failed: "Couldn't be written",
};

/** The user's recent speeches. Dates are shown in the user's own time zone. */
export function SpeechList({
  speeches,
  timezone,
}: {
  speeches: SpeechSummary[] | null;
  timezone: string;
}) {
  if (speeches === null) {
    return <p role="alert" className="text-red-800">We couldn&apos;t load your speeches. Please refresh the page.</p>;
  }
  if (speeches.length === 0) {
    return <p className="text-neutral-600">You haven&apos;t written any speeches yet.</p>;
  }

  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: timezone });

  return (
    <ul className="space-y-3">
      {speeches.map((speech) => {
        const status = STATUS_LABELS[speech.status];
        return (
          <li key={speech.id} className="rounded-md border border-neutral-300 p-3">
            <Link href={`/speeches/${speech.id}`} className="font-medium underline underline-offset-4">
              {speech.title || speech.topic}
            </Link>
            <p className="mt-1 text-sm text-neutral-600">
              {status} · {speech.targetMinutes} min
              {speech.status === "ready" ? ` · ${speech.wordCount} words` : ""} ·{" "}
              {date.format(new Date(speech.createdAt))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
