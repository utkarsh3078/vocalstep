"use client";

import type { InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/** A labelled input with its error message, linked for screen readers. */
export function Field({
  label,
  name,
  error,
  hint,
  ...input
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = `field-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-2 block w-full rounded-xl border px-4 py-3 placeholder:text-faint ${error ? "border-danger-600" : "border-line"}`}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** The form's submit button; shows a working label while the form is sending. */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-ink px-5 py-3.5 font-medium text-on-ink transition-colors hover:bg-ink-soft disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/** An error or success message for the whole form. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-danger-800">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-2xl border border-mint-200 bg-mint-50 px-4 py-3 text-mint-700">
        {message}
      </p>
    );
  }
  return null;
}
