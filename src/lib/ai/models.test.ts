import { describe, expect, it } from "vitest";

import { thinkingFor } from "./models";

describe("thinkingFor", () => {
  it("uses the lowest level for Gemini 3.x Flash and Flash-Lite", () => {
    expect(thinkingFor("gemini-3.5-flash-lite")).toEqual({ kind: "level", level: "MINIMAL" });
    expect(thinkingFor("gemini-3.6-flash")).toEqual({ kind: "level", level: "MINIMAL" });
    expect(thinkingFor("models/gemini-3.5-flash-lite")).toEqual({ kind: "level", level: "MINIMAL" });
  });

  it("knows Gemini 3.8 Flash cannot go below low", () => {
    expect(thinkingFor("gemini-3.8-flash")).toEqual({ kind: "level", level: "LOW" });
    expect(thinkingFor("gemini-3.8-flash-lite")).toEqual({ kind: "level", level: "MINIMAL" });
  });

  it("uses a token budget for Gemini 2.5", () => {
    expect(thinkingFor("gemini-2.5-flash-lite")).toEqual({ kind: "budget", tokens: 0 });
    expect(thinkingFor("gemini-2.5-flash")).toEqual({ kind: "budget", tokens: 0 });
    expect(thinkingFor("gemini-2.5-pro")).toEqual({ kind: "budget", tokens: 128 });
  });

  it("leaves unknown models on their default", () => {
    expect(thinkingFor("some-future-model")).toEqual({ kind: "default" });
  });
});
