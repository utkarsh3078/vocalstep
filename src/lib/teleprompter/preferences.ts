import { z } from "zod";

import { teleprompter } from "@/config/teleprompter";
import type { Database } from "@/lib/supabase/database.types";

import type { TeleprompterSettings } from "./storage";

/**
 * Teleprompter settings saved to a signed-in user's profile (the `pref_*`
 * columns), so they follow the user to every device. The browser keeps its
 * own copy too, for guests and for when the server cannot be reached.
 */

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PrefColumns = Pick<ProfileRow, "pref_wpm" | "pref_font_size" | "pref_line_height">;

/**
 * A profile's saved settings, in the shape `overlaySettings` reads. Columns
 * never saved are left out, so the browser's value is kept for them. The
 * theme (`pref_theme`) is the site's, saved separately (saveSiteTheme).
 */
export function settingsFromProfile(row: PrefColumns): Record<string, unknown> {
  const saved: Record<string, unknown> = {};
  if (row.pref_wpm !== null) saved.wpm = row.pref_wpm;
  if (row.pref_font_size !== null) saved.fontSize = row.pref_font_size;
  // `numeric` can arrive as a string; the line height must match a step exactly.
  if (row.pref_line_height !== null) saved.lineHeight = Number(row.pref_line_height);
  return saved;
}

const { speed, fontSize, lineHeights } = teleprompter;

/** What the browser may send. The same limits as the teleprompter's own controls. */
export const savedSettingsSchema = z
  .object({
    wpm: z.number().int().min(speed.min).max(speed.max),
    fontSize: z.number().int().min(fontSize.min).max(fontSize.max),
    lineHeight: z.number().refine((value) => (lineHeights as readonly number[]).includes(value)),
  })
  .strict();

export type SavedSettings = z.infer<typeof savedSettingsSchema>;

/** The part of the settings worth saving to the profile. */
export function settingsToSave(settings: TeleprompterSettings): SavedSettings {
  return {
    wpm: settings.wpm,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
  };
}

/** The profile columns to update for validated settings. */
export function profileUpdate(settings: SavedSettings): Partial<PrefColumns> {
  return {
    pref_wpm: settings.wpm,
    pref_font_size: settings.fontSize,
    pref_line_height: settings.lineHeight,
  };
}

/** True when two sets of saved settings are the same, so nothing needs sending. */
export function sameSettings(a: SavedSettings, b: SavedSettings): boolean {
  return a.wpm === b.wpm && a.fontSize === b.fontSize && a.lineHeight === b.lineHeight;
}
