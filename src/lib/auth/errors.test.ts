import { describe, expect, it } from "vitest";

import { GENERIC_AUTH_ERROR, authErrorMessage } from "./errors";

describe("authErrorMessage", () => {
  it("explains known codes", () => {
    expect(authErrorMessage("invalid_credentials")).toMatch(/don't match/);
  });

  it("falls back to a general message", () => {
    expect(authErrorMessage("something_new")).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage(undefined)).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage("toString")).toBe(GENERIC_AUTH_ERROR);
  });
});
