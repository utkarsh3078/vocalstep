"use client";

import { useActionState } from "react";

import { signUp, type AuthFormState } from "@/app/actions/auth";
import { auth } from "@/config/auth";

import { Field, FormMessage, SubmitButton } from "./form-parts";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signUp, {});

  // Done: the confirmation email is on its way.
  if (state.message) return <FormMessage message={state.message} />;

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage error={state.error} />
      <input type="hidden" name="next" value={next} />
      <Field
        label="Your name (optional)"
        name="fullName"
        type="text"
        autoComplete="name"
        maxLength={100}
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={auth.password.minLength}
        hint={`At least ${auth.password.minLength} characters.`}
        error={state.fieldErrors?.password}
      />
      <SubmitButton label="Create account" pendingLabel="Creating your account…" />
    </form>
  );
}
