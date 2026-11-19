import { describe, expect, it } from "vitest";

import { cleanTopic, findOutputProblems, screenTopic, tidySectionText } from "./guardrails";

describe("cleanTopic", () => {
  it("collapses spaces and removes control characters", () => {
    expect(cleanTopic("  How\t rain\n\nforms\u0007 ")).toBe("How rain forms");
  });

  it("keeps the zero-width joiner that Devanagari spelling needs", () => {
    const word = "क्‍ष";
    expect(cleanTopic(word)).toBe(word);
  });
});

describe("screenTopic", () => {
  it("lets ordinary topics through", () => {
    expect(screenTopic("Why sleep matters")).toEqual({ ok: true });
    expect(screenTopic("The history of the porcelain trade")).toEqual({ ok: true });
  });

  it("refuses blocked words in any case, as whole words", () => {
    expect(screenTopic("Tell me about PORN")).toEqual({ ok: false, reason: "unsuitable" });
    expect(screenTopic("self-harm stories")).toEqual({ ok: false, reason: "unsuitable" });
  });

  it("is not fooled by invisible characters inside a word", () => {
    expect(screenTopic("p​orn")).toEqual({ ok: false, reason: "unsuitable" });
  });
});

describe("tidySectionText", () => {
  it("drops headings, bold markers and extra blank lines", () => {
    expect(tidySectionText("## Opening\n\nHello **there**.\n\n\n\nSecond *part*.\r\n")).toBe(
      "Hello there.\n\nSecond part.",
    );
  });
});

describe("findOutputProblems", () => {
  const english = "Sleep is how the body repairs itself. Every night, it gets to work.";

  it("accepts clean spoken paragraphs", () => {
    expect(findOutputProblems(english, "en")).toEqual([]);
  });

  it("flags lists, AI chatter and links", () => {
    expect(findOutputProblems("- one point\n- another point", "en")).toContain("list");
    expect(findOutputProblems("Here is your speech about sleep. It matters.", "en")).toContain("meta");
    expect(findOutputProblems("As an AI, I think sleep matters.", "en")).toContain("meta");
    expect(findOutputProblems("Read more at https://example.com today.", "en")).toContain("link");
  });

  it("flags empty text", () => {
    expect(findOutputProblems("  ", "en")).toEqual(["empty"]);
  });

  it("checks the script matches the language", () => {
    const hindi = "नींद हमारे शरीर को आराम देती है। हर रात शरीर अपनी मरम्मत करता है।";
    expect(findOutputProblems(hindi, "hi")).toEqual([]);
    expect(findOutputProblems(english, "hi")).toContain("wrong_script");
    expect(findOutputProblems(hindi, "en")).toContain("wrong_script");
  });

  it("allows a few English words in Hindi text", () => {
    expect(findOutputProblems("आज हम smartphone के बारे में बात करेंगे और समझेंगे।", "hi")).toEqual([]);
  });
});
