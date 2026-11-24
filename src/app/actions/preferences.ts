"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { profileUpdate, savedSettingsSchema } from "@/lib/teleprompter/preferences";
import { createClient } from "@/lib/supabase/server";

export type SaveSettingsResult = { ok: true } | { error: "unauthorized" | "invalid" | "failed" };

/**
 * Saves the signed-in user's teleprompter settings (speed, text size, line
 * spacing and, once chosen, the theme) to their profile. RLS and the column
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
