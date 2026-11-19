"use client";

import { useActionState } from "react";

import { updatePassword, type AuthFormState } from "@/app/actions/auth";
import { auth } from "@/config/auth";

import { Field, FormMessage, SubmitButton } from "./form-parts";

export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(updatePassword, {});

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage error={state.error} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={auth.password.minLength}
        hint={`At least ${auth.password.minLength} characters.`}
        error={state.fieldErrors?.password}
      />
      <Field
        label="Type it again"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton label="Save new password" pendingLabel="Saving…" />
    </form>
  );
}
