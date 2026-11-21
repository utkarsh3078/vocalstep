import { teleprompter, type TeleprompterTheme } from "@/config/teleprompter";

import { clampSpeed } from "./timing";

/**
 * Teleprompter data kept in the browser's localStorage.
 *
 * Everything read back is checked field by field: storage can hold old
 * formats, values from another version of the app, or anything a user typed
 * into the developer tools. Bad values fall back to defaults.
 */

const SETTINGS_KEY = "vocalstep:teleprompter:settings";
const PROGRESS_PREFIX = "vocalstep:teleprompter:progress:";

export interface TeleprompterSettings {
  theme: TeleprompterTheme;
  /**
   * True once the visitor has picked a theme with the theme button. Every
   * setting is saved together, so without this a theme saved only because it
   * was the old default would look like a choice.
   */
  themeChosen?: boolean;
  /** Text size in CSS pixels. */
  fontSize: number;
  /** Line spacing as a multiple of the text size. */
  lineHeight: number;
  /** Reading speed in words per minute. */
  wpm: number;
}

export interface SavedProgress {
  /** Word count of the speech when saved; a different count means the text changed. */
  wordCount: number;
  wordIndex: number;
  /** Time spent reading with the teleprompter playing. */
  activeSeconds: number;
  /** When this was saved (milliseconds since 1970), to compare with the server's copy. */
  savedAt?: number;
  /** The signed-in user's practice session this progress belongs to. */
  sessionId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function defaultSettings(defaultWpm: number): TeleprompterSettings {
  return {
    theme: teleprompter.defaultTheme,
    fontSize: teleprompter.fontSize.default,
    lineHeight: teleprompter.defaultLineHeight,
    wpm: clampSpeed(defaultWpm),
  };
}

/** Reads stored settings, using the default for any missing or invalid field. */
export function parseSettings(raw: unknown, defaultWpm: number): TeleprompterSettings {
  const settings = defaultSettings(defaultWpm);
  if (!isRecord(raw)) return settings;

  const { fontSize, lineHeight, theme, themeChosen, wpm } = raw;
  const { min, max } = teleprompter.fontSize;
  const themes: readonly string[] = teleprompter.themes;
  const lineHeights: readonly number[] = teleprompter.lineHeights;

  // Only a theme the visitor picked; otherwise the current default applies.
  if (themeChosen === true && typeof theme === "string" && themes.includes(theme)) {
    settings.theme = theme as TeleprompterTheme;
    settings.themeChosen = true;
  }
  if (isFiniteNumber(fontSize) && fontSize >= min && fontSize <= max) {
    settings.fontSize = Math.round(fontSize);
  }
  if (isFiniteNumber(lineHeight) && lineHeights.includes(lineHeight)) {
    settings.lineHeight = lineHeight;
  }
  if (isFiniteNumber(wpm)) {
    settings.wpm = clampSpeed(wpm);
  }

  return settings;
}

/**
 * Reads stored progress for a speech with `wordCount` words. Returns null when
 * nothing usable is stored, including when the speech has changed since.
 */
export function parseProgress(raw: unknown, wordCount: number): SavedProgress | null {
  if (!isRecord(raw)) return null;

  const { activeSeconds, wordIndex, savedAt, sessionId } = raw;
  if (raw.wordCount !== wordCount) return null;
  if (!Number.isInteger(wordIndex) || (wordIndex as number) < 0) return null;
  if ((wordIndex as number) >= wordCount) return null;
  if (!isFiniteNumber(activeSeconds) || activeSeconds < 0) return null;

  const progress: SavedProgress = { wordCount, wordIndex: wordIndex as number, activeSeconds };
  // Optional, and missing from progress saved before tracking existed.
  if (isFiniteNumber(savedAt) && savedAt > 0) progress.savedAt = savedAt;
  if (typeof sessionId === "string" && /^[0-9a-f-]{36}$/i.test(sessionId)) progress.sessionId = sessionId;
  return progress;
}

/** Storage can be missing, full or blocked (private browsing); never let that break the page. */
function readJson(key: string): unknown {
  try {
    const text = window.localStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Saving is best effort; the teleprompter keeps working without it.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best effort, as above.
  }
}

export function progressKey(speechId: string): string {
  return PROGRESS_PREFIX + speechId;
}

export function loadSettings(defaultWpm: number): TeleprompterSettings {
  return parseSettings(readJson(SETTINGS_KEY), defaultWpm);
}

export function saveSettings(settings: TeleprompterSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

export function loadProgress(speechId: string, wordCount: number): SavedProgress | null {
  return parseProgress(readJson(progressKey(speechId)), wordCount);
}

export function saveProgress(speechId: string, progress: SavedProgress): void {
  writeJson(progressKey(speechId), progress);
}

export function clearProgress(speechId: string): void {
  remove(progressKey(speechId));
}
