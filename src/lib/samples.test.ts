import { describe, expect, it } from "vitest";

import { practice } from "@/config/practice";
import { libraryCategories, librarySpeeches } from "@/content/library";
import { samples } from "@/content/samples";
import {
  findPractisedSample,
  getAllLibrarySpeeches,
  getAllSamples,
  getLibrarySpeech,
  getSample,
  isPractiseableSample,
} from "@/lib/samples";
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

describe("library speeches", () => {
  it("has unique slugs, none shared with a public sample (both are tracked by slug)", () => {
    const slugs = [...samples, ...librarySpeeches].map((speech) => speech.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses slugs the practice tables accept", () => {
    for (const { slug } of librarySpeeches) expect(slug).toMatch(/^[a-z0-9-]{1,80}$/);
  });

  it("puts every speech in a known category", () => {
    for (const { category } of librarySpeeches) expect(Object.keys(libraryCategories)).toContain(category);
  });

  it("returns null for an unknown slug, or a public sample's", () => {
    expect(getLibrarySpeech("no-such-speech")).toBeNull();
    expect(getLibrarySpeech("../../package")).toBeNull();
    expect(getLibrarySpeech(samples[0].slug)).toBeNull();
  });

  it.each(getAllLibrarySpeeches())("$slug fits its duration", (speech) => {
    const { wpm } = practice.languages[speech.language];
    const target = wordTarget(speech.minutes, wpm);
    const { min, max } = wordRange(target, practice.generation.lengthTolerance);

    expect(speech.speech.wordCount).toBeGreaterThanOrEqual(min);
    expect(speech.speech.wordCount).toBeLessThanOrEqual(max);
  });

  it.each(getAllLibrarySpeeches())("$slug opens with a heading and has several sections", (speech) => {
    const { blocks } = speech.speech;
    expect(blocks[0].type).toBe("heading");
    expect(blocks.filter((block) => block.type === "heading").length).toBeGreaterThanOrEqual(3);
  });
});

describe("practised samples", () => {
  it("accepts public samples and library speeches, and nothing else", () => {
    expect(isPractiseableSample(samples[0].slug)).toBe(true);
    expect(isPractiseableSample(librarySpeeches[0].slug)).toBe(true);
    expect(isPractiseableSample("no-such-speech")).toBe(false);
  });

  it("links each to its own pages", () => {
    expect(findPractisedSample(samples[0].slug)).toMatchObject({
      pageHref: `/samples/${samples[0].slug}`,
      practiceHref: `/samples/${samples[0].slug}/practice`,
    });
    expect(findPractisedSample(librarySpeeches[0].slug)).toMatchObject({
      pageHref: `/library/${librarySpeeches[0].slug}`,
      practiceHref: `/library/${librarySpeeches[0].slug}/practice`,
    });
    expect(findPractisedSample("no-such-speech")).toBeNull();
  });
});
