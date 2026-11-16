import { describe, expect, it } from "vitest";

import { practice } from "@/config/practice";
import { samples } from "@/content/samples";
import { getAllSamples, getSample } from "@/lib/samples";
import { wordRange, wordTarget } from "@/lib/speech/targets";

describe("sample speeches", () => {
  it("has unique slugs", () => {
    const slugs = samples.map((sample) => sample.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("returns null for an unknown slug", () => {
    expect(getSample("no-such-sample")).toBeNull();
    expect(getSample("../../package")).toBeNull();
  });

  it.each(getAllSamples())("$slug fits its duration", (sample) => {
    const { wpm } = practice.languages[sample.language];
    const target = wordTarget(sample.minutes, wpm);
    const { min, max } = wordRange(target, practice.generation.lengthTolerance);

    expect(sample.speech.wordCount).toBeGreaterThanOrEqual(min);
    expect(sample.speech.wordCount).toBeLessThanOrEqual(max);
  });

  it.each(getAllSamples())("$slug opens with a heading and has several sections", (sample) => {
    const { blocks } = sample.speech;
    const headings = blocks.filter((block) => block.type === "heading");

    expect(blocks[0].type).toBe("heading");
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });
});
