import { describe, expect, it } from "vitest";

import {
  formatSpeakingTime,
  isTooShort,
  sectionTargets,
  speakingSeconds,
  wordRange,
  wordTarget,
} from "./targets";

describe("wordTarget", () => {
  it("multiplies minutes by speaking speed", () => {
    expect(wordTarget(5, 130)).toBe(650);
    expect(wordTarget(10, 130)).toBe(1300);
    expect(wordTarget(15, 130)).toBe(1950);
  });

  it("rejects values that are not positive", () => {
    expect(() => wordTarget(0, 130)).toThrow(RangeError);
    expect(() => wordTarget(5, -1)).toThrow(RangeError);
    expect(() => wordTarget(Number.NaN, 130)).toThrow(RangeError);
  });
});

describe("wordRange", () => {
  it("gives the range around a target", () => {
    expect(wordRange(650, 0.1)).toEqual({ min: 585, max: 715 });
    expect(wordRange(1950, 0.1)).toEqual({ min: 1755, max: 2145 });
  });
});

describe("speakingSeconds", () => {
  it("converts words to seconds at a speaking speed", () => {
    expect(speakingSeconds(650, 130)).toBe(300);
    expect(speakingSeconds(65, 130)).toBe(30);
  });

  it("returns 0 for no words", () => {
    expect(speakingSeconds(0, 130)).toBe(0);
  });
});

describe("sectionTargets", () => {
  it("splits each duration into sections of about the requested size", () => {
    expect(sectionTargets(650, 400)).toEqual([325, 325]);
    expect(sectionTargets(1300, 400)).toEqual([434, 433, 433]);
    expect(sectionTargets(1950, 400)).toEqual([390, 390, 390, 390, 390]);
  });

  it("returns one section when the total is small", () => {
    expect(sectionTargets(100, 400)).toEqual([100]);
  });

  it("always adds up to exactly the total", () => {
    for (let total = 50; total <= 4200; total += 37) {
      const sum = sectionTargets(total, 400).reduce((a, b) => a + b, 0);
      expect(sum).toBe(total);
    }
  });

  it("keeps sections within one word of each other", () => {
    const targets = sectionTargets(1777, 400);
    expect(Math.max(...targets) - Math.min(...targets)).toBeLessThanOrEqual(1);
  });
});

describe("isTooShort", () => {
  it("is true only when more than the threshold short", () => {
    expect(isTooShort(84, 100, 0.15)).toBe(true);
    expect(isTooShort(85, 100, 0.15)).toBe(false);
    expect(isTooShort(120, 100, 0.15)).toBe(false);
  });
});

describe("formatSpeakingTime", () => {
  it("rounds to whole minutes", () => {
    expect(formatSpeakingTime(300)).toBe("about 5 min");
    expect(formatSpeakingTime(285)).toBe("about 5 min");
    expect(formatSpeakingTime(60)).toBe("about 1 min");
  });

  it("handles very short texts", () => {
    expect(formatSpeakingTime(20)).toBe("under 1 min");
    expect(formatSpeakingTime(50)).toBe("about 1 min");
  });
});
