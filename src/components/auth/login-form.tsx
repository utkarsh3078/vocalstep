"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn, type AuthFormState } from "@/app/actions/auth";

import { Field, FormMessage, SubmitButton } from "./form-parts";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signIn, {});

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage error={state.error ?? notice} />
      <input type="hidden" name="next" value={next} />
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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton label="Sign in" pendingLabel="Signing in…" />
      <p className="text-sm">
        <Link href="/forgot-password" className="underline underline-offset-4">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
