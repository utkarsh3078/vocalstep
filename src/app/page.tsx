import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  Clock,
  FileText,
  Flame,
  Gauge,
  Gift,
  Globe,
  History,
  Languages,
  Maximize2,
  Mic,
  PenLine,
  Sparkles,
  Sprout,
  Timer,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { TeleprompterDemo } from "@/components/home/teleprompter-demo";
import { offeredLanguages, practice } from "@/config/practice";
import { getAllSamples, type Sample } from "@/lib/samples";
import { excerptBlocks } from "@/lib/teleprompter/demo";

/** "5, 10 or 15", from the configured durations. */
const durationList = practice.durations.join(", ").replace(/, (\d+)$/, " or $1");
/** "5–15", for the big number. */
const durationRange = `${Math.min(...practice.durations)}–${Math.max(...practice.durations)}`;
const languageList = offeredLanguages.map((code) => practice.languages[code].label).join(" and ");

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Choose your topic",
    text: "Type anything you'd like to speak about or learn about, or pick one of the examples.",
    icon: PenLine,
  },
  {
    title: "Generate your script",
    text: `Pick ${durationList} minutes. A natural, conversational speech of that length is written for you.`,
    icon: WandSparkles,
  },
  {
    title: "Start speaking",
    text: "Open the teleprompter and read aloud. The word you're on lights up as you go.",
    icon: Mic,
  },
];

/** Only what the app does today. */
const FEATURES: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "AI-written scripts",
    text: `Speeches on topics you choose, with ${practice.limits.freeSpeeches} free with an account. Topics are checked so scripts stay suitable for practice.`,
    icon: Sparkles,
  },
  {
    title: `${durationList}-minute sessions`,
    text: "Short sessions that fit into a busy day, so practice becomes a habit.",
    icon: Timer,
  },
  {
    title: "Distraction-free teleprompter",
    text: "Full screen, large text, and the current word highlighted as it scrolls.",
    icon: Maximize2,
  },
  {
    title: "Adjustable speed",
    text: "Set your own pace in words per minute and change it any time, even mid-speech.",
    icon: Gauge,
  },
  {
    title: offeredLanguages.length > 1 ? languageList : `Natural, spoken ${languageList}`,
    text:
      offeredLanguages.length > 1
        ? `Choose ${languageList} for each speech.`
        : `Scripts are written in conversational ${languageList}, with short sentences that are easy to read aloud.`,
    icon: Languages,
  },
  {
    title: "Pick up where you left off",
    text: "Your place in each speech is saved down to the word. With an account, it follows you to any device.",
    icon: BookMarked,
  },
  {
    title: "Daily streaks",
    text: `With an account, see your minutes each day and keep a streak going: ${practice.tracking.streakMinMinutes} minutes a day counts.`,
    icon: Flame,
  },
  {
    title: "Practice history",
    text: "Every speech you create is kept, with when you last practised it and how much time you've spent.",
    icon: History,
  },
];

/** An icon for each sample; new samples get a plain one until added here. */
const SAMPLE_ICONS: Record<string, LucideIcon> = {
  "small-daily-habits": Sprout,
  "how-the-internet-works": Globe,
  "reading-every-day": BookOpen,
};

/** Spoken words in the home page's teleprompter demo, before it starts again. */
const DEMO_WORDS = 150;

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-medium text-on-ink transition-colors hover:bg-ink-soft";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 font-medium text-ink transition-colors hover:border-faint";

export default function HomePage() {
  const samples = getAllSamples();

  return (
    <div data-layout="wide">
      {/* Hero */}
      <section className={`${container} grid grid-cols-1 items-center gap-14 pt-10 pb-24 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-28`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-mint-50 px-3 py-1.5 text-sm font-medium text-mint-700">
            <Mic aria-hidden="true" className="size-4" />
            Daily speaking practice
          </p>
          <h1 className="mt-6 text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-6xl">
            Your Voice Gets Stronger <span className="text-faint">Every Time You Speak.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Choose any topic, generate your speaking script, and practise for {durationList} minutes
            with your personal AI-powered teleprompter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#samples" className={primaryButton}>
              Start Speaking
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a href="#how-it-works" className={secondaryButton}>
              How it works
            </a>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <Check aria-hidden="true" className="size-4 text-mint-700" />
            No account needed to try a sample speech.
          </p>
        </div>

        <TeleprompterPreview sample={samples[0]} />
      </section>

      {/* Facts in big numbers: all from the app's own settings. */}
      <section aria-label="VocalStep in numbers" className={container}>
        <dl className={`${card} grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
          <Fact
            icon={Clock}
            label="Session length"
            value={durationRange}
            unit="min"
            note="Short enough for any day"
            tone="mint"
          />
          <Fact
            icon={Gift}
            label="Free speeches"
            value={String(practice.limits.freeSpeeches)}
            unit="speeches"
            note="With a free account"
            tone="peach"
          />
          <Fact
            icon={Flame}
            label="Streak goal"
            value={String(practice.tracking.streakMinMinutes)}
            unit="min a day"
            note="Keeps the habit going"
            tone="mint"
            sparkline
          />
        </dl>
      </section>

      {/* Samples: the quickest way to start speaking. */}
      <section id="samples" aria-labelledby="samples-heading" className={`${container} scroll-mt-6 pt-24`}>
        <SectionHeading id="samples-heading" faint="No account needed.">
          Try a sample speech.
        </SectionHeading>
        <p className="mt-4 max-w-2xl text-lg text-muted">Choose one and read it aloud in the teleprompter.</p>

        {samples.length === 0 ? (
          <p className="mt-8 text-muted">There are no sample speeches yet.</p>
        ) : (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {samples.map((sample) => (
              <SampleCard key={sample.slug} sample={sample} />
            ))}
          </ul>
        )}
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-heading" className={`${container} scroll-mt-6 pt-24`}>
        <SectionHeading id="how-heading" faint="Three steps to speaking.">
          How it works.
        </SectionHeading>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={`${card} p-7`}>
              <div className="flex items-start justify-between">
                <IconWell icon={step.icon} />
                <span className="rounded-full bg-peach-50 px-2.5 py-1 text-sm font-semibold text-peach-700 tabular-nums">
                  <span className="sr-only">Step </span>
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="features-heading" className={`${container} scroll-mt-6 pt-24`}>
        <SectionHeading id="features-heading" faint="Built for a daily habit.">
          Features.
        </SectionHeading>
        <ul className={`${card} mt-10 grid gap-px overflow-hidden bg-line sm:grid-cols-2 lg:grid-cols-4`}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className="bg-surface p-7">
              <IconWell icon={feature.icon} />
              <h3 className="mt-6 font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Your own topic */}
      <section aria-labelledby="create-heading" className={`${container} pt-24`}>
        <div className={`${card} grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:items-center`}>
          <div>
            <SectionHeading
              id="create-heading"
              faint={`${practice.limits.freeSpeeches} speeches free with an account.`}
            >
              Speak about your own topic.
            </SectionHeading>
            <p className="mt-4 text-lg text-muted">
              Create a free account and we&apos;ll write {practice.limits.freeSpeeches} speeches on topics
              you choose.
            </p>
            <Link href="/create" className={`${primaryButton} mt-8`}>
              Create a speech
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="rounded-3xl bg-canvas p-5 sm:p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-muted">
              <FileText aria-hidden="true" className="size-4" />
              Topic ideas
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {practice.topic.examples.map((topic) => (
                <li key={topic}>
                  <Link
                    href={`/create?topic=${encodeURIComponent(topic)}`}
                    className="inline-block rounded-full border border-line bg-surface px-3.5 py-2 text-sm transition-colors hover:border-faint"
                  >
                    {topic}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

/** A two-tone heading: the main words in ink, the rest in grey. */
function SectionHeading({ id, faint, children }: { id: string; faint: string; children: ReactNode }) {
  return (
    <h2 id={id} className="max-w-3xl text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
      {children} <span className="text-faint">{faint}</span>
    </h2>
  );
}

function IconWell({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-well text-ink">
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </span>
  );
}

function Fact({
  icon,
  label,
  value,
  unit,
  note,
  tone,
  sparkline = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  note: string;
  tone: "mint" | "peach";
  sparkline?: boolean;
}) {
  return (
    <div className="relative p-7 sm:p-8">
      <dt>
        <IconWell icon={icon} />
        <span className="mt-6 block text-sm font-medium text-muted">{label}</span>
      </dt>
      <dd className="mt-1">
        <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">{value}</span>{" "}
        <span className="text-lg text-muted">{unit}</span>
      </dd>
      <dd className="mt-4">
        <span
          className={`inline-block rounded-lg border px-2.5 py-1 text-sm font-medium ${
            tone === "mint"
              ? "border-mint-200 bg-mint-50 text-mint-700"
              : "border-peach-200 bg-peach-50 text-peach-700"
          }`}
        >
          {note}
        </span>
        {sparkline && (
          <svg
            viewBox="0 0 120 60"
            aria-hidden="true"
            className="absolute top-8 right-8 h-14 w-28 fill-none stroke-mint-400"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M2 50 C 20 50, 26 30, 40 34 S 58 52, 70 30 S 92 6, 104 12 S 116 20, 118 8" />
          </svg>
        )}
      </dd>
    </div>
  );
}

function SampleCard({ sample }: { sample: Sample }) {
  const Icon = SAMPLE_ICONS[sample.slug] ?? FileText;
  return (
    <li className={`${card} group relative flex flex-col p-7 transition-shadow hover:shadow-lift`}>
      <IconWell icon={Icon} />
      <h3 className="mt-6 text-xl font-semibold tracking-tight">
        {/* The link covers the whole card. */}
        <Link
          href={`/samples/${sample.slug}`}
          className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
        >
          {sample.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 leading-relaxed text-muted">{sample.summary}</p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-well px-2.5 py-1">{sample.minutes} min</span>
          <span className="rounded-full bg-well px-2.5 py-1 tabular-nums">{sample.speech.wordCount} words</span>
        </p>
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-on-ink transition-transform group-hover:translate-x-0.5"
        >
          <ArrowRight className="size-4" />
        </span>
      </div>
    </li>
  );
}

/**
 * The live teleprompter demo, reading the opening of a real sample speech,
 * with a streak card beside it (decorative).
 */
function TeleprompterPreview({ sample }: { sample: Sample | undefined }) {
  if (!sample) return null;
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="rounded-[2rem] bg-well p-2.5 shadow-lift sm:p-3">
        <TeleprompterDemo
          title={sample.title}
          blocks={excerptBlocks(sample.speech.blocks, DEMO_WORDS)}
          defaultWpm={practice.languages[sample.language].wpm}
          practiceHref={`/samples/${sample.slug}/practice`}
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute -bottom-14 -left-4 hidden w-52 rounded-3xl bg-surface p-4 shadow-lift sm:block lg:-left-12"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="size-4 text-peach-700" />
          Daily streak
        </p>
        <div className="mt-3 flex justify-between">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={index} className="flex flex-col items-center gap-1.5">
              <span
                className={`flex size-6 items-center justify-center rounded-full ${index < 4 ? "bg-mint-400 text-white" : "bg-well"}`}
              >
                {index < 4 && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="text-xs text-muted">{day}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          {practice.tracking.streakMinMinutes} minutes a day keeps it going.
        </p>
      </div>
    </div>
  );
}
