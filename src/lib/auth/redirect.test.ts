import { describe, expect, it } from "vitest";

import { auth } from "@/config/auth";

import { isProtectedPath, loginHref, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps a path on this site, with its query", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/samples/x/practice?y=1")).toBe("/samples/x/practice?y=1");
  });

  it("refuses addresses that leave the site", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
    ]) {
      expect(safeNextPath(value)).toBe(auth.defaultRedirect);
    }
  });

  it("never returns to a sign-in page, which would loop", () => {
    expect(safeNextPath("/login")).toBe(auth.defaultRedirect);
    expect(safeNextPath("/login?next=/x")).toBe(auth.defaultRedirect);
    expect(safeNextPath("/signup")).toBe(auth.defaultRedirect);
    expect(safeNextPath("/auth/confirm?token_hash=x")).toBe(auth.defaultRedirect);
    expect(safeNextPath("/loginhelp")).toBe("/loginhelp");
  });

  it("uses the fallback for empty, missing or oversized values", () => {
    expect(safeNextPath(undefined)).toBe(auth.defaultRedirect);
    expect(safeNextPath(null, "/")).toBe("/");
    expect(safeNextPath("   ")).toBe(auth.defaultRedirect);
    expect(safeNextPath(`/${"a".repeat(600)}`)).toBe(auth.defaultRedirect);
  });
});

describe("loginHref", () => {
  it("carries a safe return address", () => {
    expect(loginHref("/account?tab=1")).toBe("/login?next=%2Faccount%3Ftab%3D1");
  });

  it("drops an unsafe or missing one", () => {
    expect(loginHref("https://evil.example")).toBe("/login");
    expect(loginHref()).toBe("/login");
  });
});

describe("isProtectedPath", () => {
  it("matches protected pages and pages below them", () => {
    expect(isProtectedPath("/account")).toBe(true);
    expect(isProtectedPath("/account/settings")).toBe(true);
  });

  it("does not match public pages or look-alike names", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/samples/x")).toBe(false);
    expect(isProtectedPath("/accounts")).toBe(false);
  });
});
