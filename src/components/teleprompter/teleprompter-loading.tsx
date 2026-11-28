import type { CSSProperties } from "react";

/** Widths of the placeholder lines, so they read like a paragraph. */
const LINE_WIDTHS = ["100%", "94%", "98%", "88%", "96%", "64%"];
const WAVE_BARS = [0.55, 0.85, 1, 0.7, 0.45];

/**
 * The teleprompter while it loads: the same full-screen layer, header,
 * progress track, text column and controls bar as the real screen, so the
 * page turns straight into the teleprompter instead of jumping to it.
 *
 * It needs no JavaScript and follows the site's theme through `dark:`, so it
 * works as a server-rendered Suspense fallback. Motion is off for anyone who
 * prefers reduced motion.
 */
export function TeleprompterLoading({ title }: { title?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
    >
      <span className="sr-only">Preparing your teleprompter…</span>

      <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col">
        {/* Header: title, the three stat pills and Exit, as on the real screen. */}
        <div className="px-3 pt-3 pb-2 text-sm sm:px-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              {title ? (
                <p className="truncate font-semibold">{title}</p>
              ) : (
                <Bar className="h-4 w-48 max-w-full" />
              )}
            </div>
            <div className="flex gap-1.5">
              <Pill className="w-24" />
              <Pill className="w-20" />
              <Pill className="w-12" />
            </div>
            <span className="block h-8 w-20 rounded-full border border-line bg-surface dark:border-neutral-700 dark:bg-transparent" />
          </div>
        </div>

        {/* Progress track with a light sweeping along it. */}
        <div className="relative mx-auto h-1 w-full max-w-5xl overflow-hidden rounded-full bg-well sm:w-[calc(100%-2.5rem)] dark:bg-neutral-800">
          <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-mint-700 opacity-70 motion-safe:animate-tp-sweep dark:bg-mint-400" />
        </div>

        {/* The text column: a voice wave near the reading line, then the outline of a paragraph. */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto max-w-3xl px-4 pt-[26vh] sm:px-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-10 items-center gap-1.5">
                {WAVE_BARS.map((height, index) => (
                  <span
                    key={index}
                    className="w-1.5 rounded-full bg-mint-700 motion-safe:animate-tp-wave dark:bg-mint-400"
                    style={{ height: `${height * 100}%`, animationDelay: `${index * 0.12}s` }}
                  />
                ))}
              </div>
              <p className="mt-4 text-lg font-medium">Preparing your teleprompter…</p>
              <p className="mt-1 text-sm text-muted dark:text-neutral-400">
                Fitting the text to your screen and reading speed.
              </p>
            </div>

            <div className="mt-12 space-y-4">
              <Bar className="h-5 w-2/5" delay={0} />
              {LINE_WIDTHS.map((width, index) => (
                <Bar key={index} className="h-3.5" style={{ width }} delay={(index + 1) * 0.12} />
              ))}
            </div>
          </div>

          {/* Fades the paragraph out towards the controls. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-white dark:from-neutral-950" />
        </div>

        {/* Controls bar placeholder. */}
        <div className="px-3 pt-2 pb-3 sm:pb-5">
          <div className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-4xl border border-line bg-surface p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900/95 dark:shadow-black/40">
            <Bar className="h-8 w-16" />
            <Bar className="h-8 w-24" />
            <span className="h-11 w-28 rounded-full bg-ink opacity-15 dark:bg-white" />
            <Bar className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A soft rounded placeholder that pulses; delays stagger a group of them. */
function Bar({
  className = "",
  style,
  delay = 0,
}: {
  className?: string;
  style?: CSSProperties;
  delay?: number;
}) {
  return (
    <span
      className={`block rounded-full bg-neutral-900/7 motion-safe:animate-tp-pulse dark:bg-white/8 ${className}`}
      style={{ ...style, animationDelay: `${delay}s` }}
    />
  );
}

function Pill({ className = "" }: { className?: string }) {
  return <span className={`block h-8 rounded-full bg-canvas dark:bg-neutral-900 ${className}`} />;
}
