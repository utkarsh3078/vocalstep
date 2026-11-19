"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/config/auth";
import { site } from "@/config/site";
import { authErrorMessage } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type FieldErrors,
} from "@/lib/auth/schemas";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

/** What a sign-in form shows after it is submitted. Passwords are never sent back. */
export interface AuthFormState {
  error?: string;
  fieldErrors?: FieldErrors;
  /** A success message, such as "check your email". */
  message?: string;
  /** Values to put back in the form after an error. */
  values?: { email?: string; fullName?: string };
}

const NOT_CONFIGURED: AuthFormState = {
  error: "Accounts are not set up on this site yet. Please try again later.",
};

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * This site's address, for links in emails and sign-in redirects. Taken from
 * the request so it works locally and in production; Supabase only follows
 * addresses on its allow list, so a forged header cannot redirect elsewhere.
 */
async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : site.url;
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email");
  const parsed = loginSchema.safeParse({ email, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email } };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error.code), values: { email } };

  redirect(safeNextPath(text(formData, "next")));
}

export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: text(formData, "email"), fullName: text(formData, "fullName") };
  const parsed = signupSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const next = safeNextPath(text(formData, "next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: parsed.data.fullName ? { full_name: parsed.data.fullName } : {},
      // Used only if the project still has Supabase's default email template.
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: authErrorMessage(error.code), values };

  // With email confirmation switched off, the user is signed in straight away.
  if (data.session) redirect(next);

  // Same message whether or not the email already had an account, so the form
  // cannot be used to find out who has signed up.
  return {
    message: `We've sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.`,
  };
}

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email");
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email } };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Used only if the project still has Supabase's default email template.
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  // Only rate limits are reported. Anything else gets the same answer, so the
  // form cannot be used to find out who has an account.
  if (error?.code?.startsWith("over_")) {
    return { error: authErrorMessage(error.code), values: { email } };
  }

  return {
    message: `If an account exists for ${parsed.data.email}, we've sent it a link to choose a new password.`,
  };
}

export async function updatePassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const user = await getCurrentUser();
  if (!user) {
    return { error: "Your reset link has expired. Please ask for a new one." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error.code) };

  redirect("/account?updated=password");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(text(formData, "next"));
  if (!auth.google || !isSupabaseConfigured()) redirect("/login?error=google");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");

  redirect(data.url);
}
