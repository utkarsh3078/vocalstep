/** Pure helpers for reading provider errors, kept apart so they can be tested. */

/** Finish reasons that mean a safety or policy filter stopped the reply. */
const BLOCKING_REASONS = new Set([
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "RECITATION",
  "IMAGE_SAFETY",
]);

export function isBlockingFinish(reason: string | undefined): boolean {
  return reason !== undefined && BLOCKING_REASONS.has(reason);
}

/**
 * How long Google asks us to wait after "rate limit reached", read from the
 * error details (`"retryDelay": "7s"`), capped at `maxSeconds`. Defaults to
 * the cap when the error does not say.
 */
export function retryDelaySeconds(message: string, maxSeconds: number): number {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message);
  const seconds = match ? Number(match[1]) : maxSeconds;
  return Math.min(maxSeconds, Math.max(1, seconds));
}

/**
 * Whether a "rate limit reached" error is worth one retry. A daily quota will
 * not reset in seconds, so waiting for it only delays the "busy" message.
 */
export function isRetryableRateLimit(message: string): boolean {
  return !/PerDay|per day|daily/i.test(message);
}
