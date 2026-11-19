import { practice } from "@/config/practice";
import { teleprompter } from "@/config/teleprompter";

/** Time left to read from `position` to the end at `wpm`, in seconds. */
export function remainingSeconds(position: number, wordCount: number, wpm: number): number {
  if (wpm <= 0) return 0;
  const wordsLeft = Math.max(0, wordCount - Math.max(0, position));
  return (wordsLeft / wpm) * 60;
}

/** How far through the speech a position is, from 0 to 1. */
export function progressAt(position: number, wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.min(1, Math.max(0, position / wordCount));
}

/** True once enough of the speech is read for Finish to count as completed. */
export function canFinish(progress: number): boolean {
  return progress >= practice.completionThreshold;
}

/** Whole percent for display. Never shows 100% before the end is reached. */
export function formatPercent(progress: number): string {
  const percent = progress >= 1 ? 100 : Math.min(99, Math.floor(progress * 100));
  return `${percent}%`;
}

/** A clock reading such as "4:07" or "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

/** Keeps a speed within the allowed range and on a whole step. */
export function clampSpeed(wpm: number): number {
  const { min, max, step } = teleprompter.speed;
  if (!Number.isFinite(wpm)) return min;
  const stepped = Math.round(wpm / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/** The next speed up (direction 1) or down (direction -1). */
export function stepSpeed(wpm: number, direction: 1 | -1): number {
  return clampSpeed(clampSpeed(wpm) + direction * teleprompter.speed.step);
}

/** The next text size up or down, within the allowed range. */
export function stepFontSize(size: number, direction: 1 | -1): number {
  const { min, max, step } = teleprompter.fontSize;
  return Math.min(max, Math.max(min, size + direction * step));
}

/** The next line spacing up or down from the allowed list. */
export function stepLineHeight(lineHeight: number, direction: 1 | -1): number {
  const options = teleprompter.lineHeights;
  const current = options.findIndex((option) => option >= lineHeight);
  const index = current === -1 ? options.length - 1 : current;
  const next = Math.min(options.length - 1, Math.max(0, index + direction));
  return options[next];
}
