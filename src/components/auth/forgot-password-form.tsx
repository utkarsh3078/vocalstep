"use client";

import { useActionState } from "react";

import { requestPasswordReset, type AuthFormState } from "@/app/actions/auth";

import { Field, FormMessage, SubmitButton } from "./form-parts";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});

  if (state.message) return <FormMessage message={state.message} />;

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage error={state.error} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
