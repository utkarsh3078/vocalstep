import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { settingsFromProfile } from "@/lib/teleprompter/preferences";
import { parseTheme, type SiteTheme } from "@/lib/theme";

/** Display preferences saved to the signed-in user's profile (RLS applies). */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The teleprompter settings saved to the user's profile, or undefined when
 * they could not be read (the teleprompter then uses this browser's own).
 */
export async function getSavedSettings(
  supabase: Supabase,
  userId: string,
): Promise<Record<string, unknown> | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("pref_wpm, pref_font_size, pref_line_height")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Could not load the teleprompter settings:", error.code, error.message);
    return undefined;
  }
  return data ? settingsFromProfile(data) : undefined;
}

/** The theme the user picked and saved to their profile, or null if none (or unreadable). */
export async function getSavedTheme(supabase: Supabase, userId: string): Promise<SiteTheme | null> {
  const { data, error } = await supabase.from("profiles").select("pref_theme").eq("id", userId).maybeSingle();
  if (error) {
    console.error("Could not load the theme:", error.code, error.message);
    return null;
  }
  return parseTheme(data?.pref_theme);
}
