function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
}

/** How many words fill the given minutes at the given speaking speed. */
export function wordTarget(minutes: number, wpm: number): number {
  assertPositive(minutes, "minutes");
  assertPositive(wpm, "wpm");
  return Math.round(minutes * wpm);
}

/** The acceptable word-count range around a target, e.g. 650 ± 10% is 585–715. */
export function wordRange(
  target: number,
  tolerance: number,
): { min: number; max: number } {
  assertPositive(target, "target");
  return {
    min: Math.round(target * (1 - tolerance)),
    max: Math.round(target * (1 + tolerance)),
  };
}

/** How long it takes to speak the given number of words, in seconds. */
export function speakingSeconds(words: number, wpm: number): number {
  assertPositive(wpm, "wpm");
  return Math.round((Math.max(0, words) / wpm) * 60);
}

/**
 * Splits a speech's word target into per-section targets of roughly
 * `sectionWords` each. The parts always add up to exactly `totalWords`.
 */
export function sectionTargets(totalWords: number, sectionWords: number): number[] {
  assertPositive(totalWords, "totalWords");
  assertPositive(sectionWords, "sectionWords");

  const total = Math.round(totalWords);
  return splitTarget(total, Math.max(1, Math.round(total / sectionWords)));
}

/** Splits a word target into `parts` near-equal whole numbers that add up to it. */
export function splitTarget(totalWords: number, parts: number): number[] {
  assertPositive(totalWords, "totalWords");
  assertPositive(parts, "parts");

  const total = Math.round(totalWords);
  const count = Math.floor(parts);
  const base = Math.floor(total / count);
  const remainder = total - base * count;

  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

/** True when a section is short enough of its target to need extending. */
export function isTooShort(
  actualWords: number,
  targetWords: number,
  threshold: number,
): boolean {
  return actualWords < targetWords * (1 - threshold);
}

/** A rough, human-friendly speaking time such as "about 5 min". */
export function formatSpeakingTime(seconds: number): string {
  if (seconds < 45) return "under 1 min";
  return `about ${Math.max(1, Math.round(seconds / 60))} min`;
}
