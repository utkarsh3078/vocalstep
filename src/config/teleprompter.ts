/**
 * Teleprompter display limits and timings.
 * The default speed comes from the speech's language in `practice.languages`.
 */
export const teleprompter = {
  /** Reading speed in words per minute. */
  speed: { min: 60, max: 240, step: 10 },

  /** Text size in CSS pixels. */
  fontSize: { min: 20, max: 72, step: 4, default: 32 },

  /** Line spacing as a multiple of the text size. */
  lineHeights: [1.3, 1.5, 1.7, 2],
  defaultLineHeight: 1.5,

  themes: ["dark", "light"],
  defaultTheme: "dark",

  /**
   * Between paragraphs and past headings there is nothing to read, so the text
   * moves on at this many line heights per second instead of the reading speed.
   */
  gapLinesPerSecond: 2,

  /** The reading line sits this fraction of the screen height from the top. */
  readingLine: 1 / 3,

  /** How often progress is written to the browser while it changes. */
  saveIntervalMs: 1000,
  /** How often the time and progress display refreshes while playing. */
  displayIntervalMs: 250,
  /** After the user scrolls by hand, auto-scroll waits this long before moving again. */
  manualScrollPauseMs: 200,
  /** Longest frame step counted, so a stalled tab cannot jump the text or the timer. */
  maxFrameSeconds: 0.25,
} as const;

export type TeleprompterTheme = (typeof teleprompter.themes)[number];
