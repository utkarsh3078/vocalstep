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
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-neutral-600">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1 block w-full rounded-md border px-3 py-2 ${error ? "border-red-600" : "border-neutral-400"}`}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
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
      className="w-full rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/** An error or success message for the whole form. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
        {message}
      </p>
    );
  }
  return null;
}
