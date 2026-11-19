import { z } from "zod";

import { auth } from "@/config/auth";

/** Form inputs for the sign-in pages. Shared by the server actions and the tests. */

const email = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

const newPassword = z
  .string({ error: "Choose a password." })
  .min(auth.password.minLength, `Use at least ${auth.password.minLength} characters.`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= auth.password.maxLength,
    `Use at most ${auth.password.maxLength} characters.`,
  );

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(100, "Use at most 100 characters.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string({ error: "Type the password again." }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  });

/** Field name to first error message, for showing next to each input. */
export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}
