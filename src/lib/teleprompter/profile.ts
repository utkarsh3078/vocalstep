import "server-only";

import type { createClient } from "@/lib/supabase/server";

import { settingsFromProfile } from "./preferences";

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
    .select("pref_wpm, pref_font_size, pref_line_height, pref_theme")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Could not load the teleprompter settings:", error.code, error.message);
    return undefined;
  }
  return data ? settingsFromProfile(data) : undefined;
}
