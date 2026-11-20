/**
 * Every tunable number and list for practice and generation lives here.
 * Change a value in this file and the whole app follows.
 */
export const practice = {
  /** Session lengths the user can choose, in minutes. */
  durations: [5, 10, 15],
  defaultDuration: 5,

  /**
   * Languages are plain text codes, so adding one needs no database change.
   * `wpm` is the speaking speed used for word targets and time estimates.
   * `tokensPerWord` sizes the AI's output budget; Devanagari needs more tokens
   * per word than English. The Hindi figures are starting points; tune them after
   * real testing.
   */
  languages: {
    en: { label: "English", wpm: 130, tokensPerWord: 1.6 },
    hi: { label: "Hindi", wpm: 130, tokensPerWord: 4 },
  },
  defaultLanguage: "en",

  difficulties: {
    beginner: { label: "Beginner" },
    intermediate: { label: "Intermediate" },
    advanced: { label: "Advanced" },
  },
  defaultDifficulty: "intermediate",

  /**
   * A session counts as completed, and Finish is offered, at this fraction of the speech.
   * The database uses the same number (supabase/migrations/*_practice.sql); change both.
   */
  completionThreshold: 0.9,

  /** Practice tracking for signed-in users: minutes, sessions and streaks. */
  tracking: {
    /** A day counts toward the streak with at least this much practice. */
    streakMinMinutes: 2,
    /** While practising, progress is saved to the server this often. */
    syncIntervalSeconds: 15,
    /**
     * The most practice time one save can add. The database enforces the same
     * number (supabase/migrations/*_practice.sql); change both.
     */
    maxSecondsPerSave: 60,
  },

  topic: {
    minLength: 3,
    maxLength: 300,
    /** Shown as clickable examples on the Create page. */
    examples: [
      "Why sleep matters",
      "How rain forms",
      "The joy of cooking at home",
      "What makes a good friend",
      "How smartphones changed daily life",
      "Learning from mistakes",
    ],
    /**
     * Words that get a topic refused before any AI request is made. Matched as
     * whole words, ignoring case. The AI's own topic check catches the rest;
     * this list only saves a request on the obvious cases.
     */
    blockedTerms: [
      "porn",
      "pornography",
      "nude",
      "nudes",
      "xxx",
      "rape",
      "suicide",
      "self-harm",
      "terrorist",
      "terrorism",
    ],
  },

  generation: {
    /** Approximate size of one generated section. Fewer, larger sections mean fewer AI requests. */
    sectionWords: 400,
    /** A finished speech should land within this fraction of its word target. */
    lengthTolerance: 0.1,
    /** A section more than this fraction short of its target is extended once. */
    shortSectionThreshold: 0.15,
    /** Output budget for the outline request, in tokens. */
    outlineMaxTokens: 2048,
    /** Extra output budget on every section request, for thinking and slack. */
    sectionTokenAllowance: 600,
    /** One AI request may take this long before it is given up. */
    requestTimeoutSeconds: 60,
    /** After "rate limit reached", wait at most this long before the one retry. */
    rateLimitRetryMaxSeconds: 10,
    /** A speech still "generating" after this long is treated as abandoned. */
    staleAfterMinutes: 15,
  },

  /**
   * The database enforces the same numbers (supabase/migrations/*_speech_limits.sql),
   * because users can reach it directly. Change both together.
   */
  limits: {
    /** Free generated speeches per account, for the life of the account. */
    freeSpeeches: 2,
    /** Generation attempts per user per 24 hours, counting refused and failed ones. */
    attemptsPerDay: 6,
    /** Speeches per 24 hours across all users. Keep this below the AI provider's daily quota. */
    globalSpeechesPerDay: 80,
  },

  /**
   * Why a topic can be refused, with the message shown to the user.
   * The AI returns one of these codes instead of writing a speech.
   */
  refusalReasons: {
    politics:
      "VocalStep doesn't write speeches about politics, parties or elections. Try a different topic.",
    religion:
      "VocalStep doesn't write speeches about religion, caste or communal issues. Try a different topic.",
    sexual: "This topic isn't suitable for speaking practice. Try a different topic.",
    violence: "This topic isn't suitable for speaking practice. Try a different topic.",
    hate: "This topic isn't suitable for speaking practice. Try a different topic.",
    illegal: "This topic isn't suitable for speaking practice. Try a different topic.",
    personal_advice:
      "VocalStep can't give medical, legal or financial advice. Try a general topic instead.",
    unsuitable: "This topic isn't suitable for speaking practice. Try a different topic.",
    not_a_topic:
      "We couldn't understand this topic. Try rephrasing it in a few clear words.",
  },
} as const;

export type Duration = (typeof practice.durations)[number];
export type LanguageCode = keyof typeof practice.languages;
export type Difficulty = keyof typeof practice.difficulties;
export type RefusalReason = keyof typeof practice.refusalReasons;
