import { describe, expect, it } from "vitest";

import { fieldErrors, loginSchema, resetPasswordSchema, signupSchema } from "./schemas";

describe("signupSchema", () => {
  it("accepts a valid sign-up and tidies the email", () => {
    const result = signupSchema.parse({
      fullName: "  Asha  ",
      email: "  Asha@Example.COM ",
      password: "long enough",
    });
    expect(result).toEqual({ fullName: "Asha", email: "asha@example.com", password: "long enough" });
  });

  it("treats a blank name as no name", () => {
    expect(signupSchema.parse({ fullName: "  ", email: "a@b.co", password: "12345678" }).fullName)
      .toBeUndefined();
  });

  it("rejects short passwords and bad emails with field messages", () => {
    const result = signupSchema.safeParse({ email: "not-an-email", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.email).toBe("Enter a valid email address.");
      expect(errors.password).toBe("Use at least 8 characters.");
    }
  });

  it("rejects a password over 72 bytes, counting multi-byte characters", () => {
    expect(signupSchema.safeParse({ email: "a@b.co", password: "a".repeat(73) }).success).toBe(false);
    // 25 Devanagari letters are 75 bytes.
    expect(signupSchema.safeParse({ email: "a@b.co", password: "क".repeat(25) }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("asks for both fields", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        email: "Enter your email address.",
        password: "Enter your password.",
      });
    }
  });

  it("handles missing form fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("needs the two passwords to match", () => {
    const result = resetPasswordSchema.safeParse({ password: "new password", confirmPassword: "other" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).confirmPassword).toBe("The two passwords do not match.");
    }
  });
});
