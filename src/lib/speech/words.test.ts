import { describe, expect, it } from "vitest";

import { countWords, splitWords } from "./words";

describe("countWords", () => {
  it("counts plain English words", () => {
    expect(countWords("The quick brown fox")).toBe(4);
  });

  it("treats any run of whitespace as one separator", () => {
    expect(countWords("  one \t two\n\nthree   four  ")).toBe(4);
  });

  it("keeps punctuation attached to its word", () => {
    expect(countWords("Hello, world! How are you?")).toBe(5);
  });

  it("counts hyphenated words and contractions once", () => {
    expect(countWords("It's a well-known ten-minute walk")).toBe(5);
  });

  it("counts numbers as words", () => {
    expect(countWords("I have 3 cats and 12 fish")).toBe(7);
  });

  it("does not count punctuation that stands alone", () => {
    expect(countWords("Wait — really ? Yes .")).toBe(3);
  });

  it("counts Devanagari words", () => {
    expect(countWords("नमस्ते, आप कैसे हैं? मैं ठीक हूँ।")).toBe(7);
  });

  it("does not count a danda separated by a space", () => {
    expect(countWords("मैं ठीक हूँ ।")).toBe(3);
  });

  it("returns 0 for empty or punctuation-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n  ")).toBe(0);
    expect(countWords("— ... !")).toBe(0);
  });
});

describe("splitWords", () => {
  it("attaches standalone punctuation to the previous word", () => {
    expect(splitWords("Wait — really")).toEqual(["Wait —", "really"]);
  });

  it("attaches leading punctuation to the first word", () => {
    expect(splitWords("— Hello there")).toEqual(["— Hello", "there"]);
  });

  it("returns the same number of items that countWords reports", () => {
    const text = "One, two — three. चार पाँच ।";
    expect(splitWords(text)).toHaveLength(countWords(text));
  });
});
