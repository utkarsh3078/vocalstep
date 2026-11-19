import { describe, expect, it } from "vitest";

import { practice } from "@/config/practice";

import { generationErrorMessage } from "./messages";

describe("generationErrorMessage", () => {
  it("explains a refusal with its reason", () => {
    expect(generationErrorMessage("refused", "politics")).toBe(practice.refusalReasons.politics);
  });

  it("falls back for a refusal without a known reason", () => {
    expect(generationErrorMessage("refused")).toBe(practice.refusalReasons.not_a_topic);
  });

  it("asks to rephrase after a block or failure, and says no free speech was used", () => {
    for (const code of ["blocked", "failed"] as const) {
      const message = generationErrorMessage(code);
      expect(message).toContain("Try rephrasing this topic");
      expect(message).toContain("didn't use up a free speech");
    }
  });

  it("says busy in the planned words", () => {
    expect(generationErrorMessage("busy")).toContain("We're busy right now, please try again in a minute");
  });
});
