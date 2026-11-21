"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { practice } from "@/config/practice";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { checkEdit, editProblemMessage, normaliseContent } from "@/lib/speech/edit";
import { createClient } from "@/lib/supabase/server";

/**
 * Changes a user makes to their own speeches. Every action checks the session
 * itself; RLS then limits each update to the user's own rows.
 */

export interface EditState {
  error?: string;
}

const editSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().min(1),
  title: z.string().max(2_000),
  content: z.string().max(200_000),
});

const SIGNED_OUT = "Your session has ended. Please sign in again, then save.";

/**
 * Saves a speech edited on its Edit page. A change to the text bumps the
 * version, so saved practice positions in the old text are not used; a new
 * title alone does not. The update only applies to the version the user
 * opened, so an edit made meanwhile in another tab is never overwritten.
 */
export async function saveSpeechEdit(_previous: EditState, form: FormData): Promise<EditState> {
  const parsed = editSchema.safeParse({
    id: form.get("id"),
    version: form.get("version"),
    title: form.get("title") ?? "",
    content: form.get("content") ?? "",
  });
  if (!parsed.success) return { error: "Something went wrong. Please reload the page and try again." };
  if (!isSupabaseConfigured()) return { error: SIGNED_OUT };
  const user = await getCurrentUser();
  if (!user) return { error: SIGNED_OUT };

  const checked = checkEdit(parsed.data.title, parsed.data.content);
  if (!checked.ok) return { error: editProblemMessage(checked.problem) };
  const { id, version } = parsed.data;
  const { title, content, wordCount } = checked.edit;

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("speeches")
    .select("title, content")
    .eq("id", id)
    .eq("version", version)
    .eq("status", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) {
    console.error("Could not read a speech to edit:", readError.code, readError.message);
    return { error: "We couldn't save your changes just now. Please try again." };
  }
  if (!current) return { error: CHANGED_ELSEWHERE };

  // Compared tidied, so saving untouched text never counts as a change.
  const textChanged = normaliseContent(current.content) !== content;
  if (textChanged || current.title !== title) {
    const { data, error } = await supabase
      .from("speeches")
      .update({
        title,
        ...(textChanged ? { content, word_count: wordCount, version: version + 1 } : {}),
      })
      .eq("id", id)
      .eq("version", version)
      .is("deleted_at", null)
      .select("id");
    if (error) {
      console.error("Could not save a speech edit:", error.code, error.message);
      return { error: "We couldn't save your changes just now. Please try again." };
    }
    if (data.length === 0) return { error: CHANGED_ELSEWHERE };
  }

  refresh();
  redirect(`/speeches/${id}?saved=1`);
}

const CHANGED_ELSEWHERE =
  "This speech was changed or deleted somewhere else. Copy your text, reload the page and try again.";

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes one of the user's speeches. Speeches are only ever soft-deleted, so
 * practice minutes and streaks are kept, and deleting does not give back a
 * free speech. A speech still being written cannot be deleted yet.
 */
export async function deleteSpeech(id: string): Promise<DeleteResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Something went wrong. Please reload the page." };
  if (!isSupabaseConfigured() || !(await getCurrentUser())) {
    return { ok: false, error: "Your session has ended. Please sign in again." };
  }

  // One left "generating" too long is shown as failed (displayStatus), so it can go.
  const now = Date.now();
  const staleBefore = new Date(now - practice.generation.staleAfterMinutes * 60_000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("speeches")
    .update({ deleted_at: new Date(now).toISOString() })
    .eq("id", parsed.data)
    .is("deleted_at", null)
    .or(`status.neq.generating,created_at.lt.${staleBefore}`)
    .select("id");
  if (error) {
    console.error("Could not delete a speech:", error.code, error.message);
    return { ok: false, error: "We couldn't delete this speech just now. Please try again." };
  }
  if (data.length === 0) {
    return { ok: false, error: "This speech can't be deleted right now. Please reload the page." };
  }

  refresh();
  return { ok: true };
}
