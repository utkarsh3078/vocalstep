import { describe, expect, it } from "vitest";

import { parseSpeech } from "@/lib/speech/blocks";

import { demoDelay, excerptBlocks, excerptWordCount, paragraphEnds } from "./demo";

const words = (count: number, prefix = "w") => Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");
const { blocks } = parseSpeech(`## One\n\n${words(30, "a")}\n\n${words(40, "b")}\n\n## Two\n\n${words(50, "c")}`);

describe("excerptBlocks", () => {
  it("stops at the paragraph that reaches the word count", () => {
    const excerpt = excerptBlocks(blocks, 50);
    expect(excerpt.map((block) => block.type)).toEqual(["heading", "paragraph", "paragraph"]);
    expect(excerptWordCount(excerpt)).toBe(70);
  });

  it("never ends on a heading", () => {
    // 70 words are reached by the second paragraph; the "Two" heading must not follow.
    expect(excerptBlocks(blocks, 70).at(-1)?.type).toBe("paragraph");
  });

  it("takes the whole speech when it is shorter than asked", () => {
    expect(excerptWordCount(excerptBlocks(blocks, 1000))).toBe(120);
  });

  it("handles an empty speech", () => {
    expect(excerptBlocks([], 50)).toEqual([]);
    expect(excerptWordCount([])).toBe(0);
  });
});

describe("demoDelay", () => {
  const ends = paragraphEnds(blocks);

  it("knows where each paragraph ends", () => {
    expect([...ends]).toEqual([29, 69, 119]);
  });

  it("spends one word's time per word at the chosen speed", () => {
    expect(demoDelay(0, 120, 120, ends)).toBe(500);
    expect(demoDelay(0, 60, 120, ends)).toBe(1000);
  });

  it("pauses twice as long at the end of a paragraph", () => {
    expect(demoDelay(29, 120, 120, ends)).toBe(1000);
  });

  it("rests on the last word before starting again", () => {
    expect(demoDelay(119, 120, 120, ends, 2000)).toBe(2000);
  });
});
