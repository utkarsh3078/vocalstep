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
  /**
   * Used where the site's theme is unknown (tests). In the browser, the
   * teleprompter opens in the site's light or dark theme; a visitor's own
   * choice from the theme button is kept (see storage.ts).
   */
  defaultTheme: "light",

  /**
   * Between paragraphs and past headings there is nothing to read, so the text
   * moves on at this many line heights per second instead of the reading speed.
   */
  gapLinesPerSecond: 2,

  /** The reading line sits this fraction of the screen height from the top. */
  readingLine: 1 / 3,

  /**
   * Word highlight. All text sits light; the word at the reading line turns
   * dark and bold, words just ahead brighten as it approaches, and words just
   * read fade back to light.
   */
  highlight: {
    /** Opacity of text away from the reading point, from 0 to 1. */
    dimOpacity: 0.38,
    /** Words this far ahead of the reading point start to darken. */
    aheadWords: 1.5,
    /** Words behind it fade back to light over this many words. */
    behindWords: 3,
    /**
     * An outline drawn around the current word's letters so it looks bold,
     * in em. Real bold would widen the word and re-wrap the lines.
     */
    boldStrokeEm: 0.035,
  },

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
