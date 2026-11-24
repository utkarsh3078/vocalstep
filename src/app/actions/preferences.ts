"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { profileUpdate, savedSettingsSchema } from "@/lib/teleprompter/preferences";
import { createClient } from "@/lib/supabase/server";
import { siteThemes } from "@/lib/theme";

export type SaveSettingsResult = { ok: true } | { error: "unauthorized" | "invalid" | "failed" };

/**
 * Saves the signed-in user's teleprompter settings (speed, text size and line
 * spacing) to their profile. RLS and the column
 * grants limit the update to the user's own preference columns.
 */
export async function saveTeleprompterSettings(input: unknown): Promise<SaveSettingsResult> {
  const parsed = savedSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  if (!isSupabaseConfigured()) return { error: "unauthorized" };

  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(profileUpdate(parsed.data)).eq("id", user.id);
  if (error) {
    console.error("Could not save the teleprompter settings:", error.code, error.message);
    return { error: "failed" };
  }
  return { ok: true };
}

const themeSchema = z.enum(siteThemes);

/**
 * Saves the theme the signed-in user picked (light or dark) to their profile,
 * so the site and the teleprompter open in it on every device they sign in on.
 */
export async function saveSiteTheme(theme: unknown): Promise<SaveSettingsResult> {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { error: "invalid" };
  if (!isSupabaseConfigured()) return { error: "unauthorized" };

  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ pref_theme: parsed.data }).eq("id", user.id);
  if (error) {
    console.error("Could not save the theme:", error.code, error.message);
    return { error: "failed" };
  }
  return { ok: true };
}
