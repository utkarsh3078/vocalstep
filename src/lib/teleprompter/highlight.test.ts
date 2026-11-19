import { describe, expect, it } from "vitest";

import { emphasis, highlightRange, wordOpacity } from "./highlight";

const shape = { aheadWords: 1.5, behindWords: 3 };

describe("emphasis", () => {
  it("is strongest when the reading point is at the middle of the word", () => {
    expect(emphasis(4, 4.5, shape)).toBe(1);
    expect(emphasis(4, 4.4, shape)).toBeLessThan(1);
  });

  it("fades quickly ahead and slowly behind", () => {
    const ahead = emphasis(5, 4.5, shape); // one word ahead
    const behind = emphasis(3, 4.5, shape); // one word behind
    expect(ahead).toBeGreaterThan(0);
    expect(behind).toBeGreaterThan(ahead);
  });

  it("is zero beyond the fade on either side", () => {
    expect(emphasis(6, 4.5, shape)).toBe(0); // 1.5 words ahead
    expect(emphasis(1, 4.5, shape)).toBe(0); // 3 words behind
  });

  it("changes smoothly as the position moves, with no jumps", () => {
    let previous = emphasis(10, 7, shape);
    for (let position = 7.01; position <= 14; position += 0.01) {
      const next = emphasis(10, position, shape);
      expect(Math.abs(next - previous)).toBeLessThan(0.02);
      previous = next;
    }
  });
});

describe("highlightRange", () => {
  it("covers every word that can be highlighted", () => {
    const [first, last] = highlightRange(10.2, 100, shape)!;
    for (let word = 0; word < 100; word += 1) {
      if (emphasis(word, 10.2, shape) > 0) {
        expect(word).toBeGreaterThanOrEqual(first);
        expect(word).toBeLessThanOrEqual(last);
      }
    }
    expect(last - first).toBeLessThanOrEqual(6);
  });

  it("stays inside the speech", () => {
    expect(highlightRange(0, 50, shape)).toEqual([0, 1]);
    expect(highlightRange(50, 50, shape)).toEqual([46, 49]);
    expect(highlightRange(3, 0, shape)).toBeNull();
  });
});

describe("wordOpacity", () => {
  it("runs from the dim level to fully dark", () => {
    expect(wordOpacity(0, 0.38)).toBeCloseTo(0.38);
    expect(wordOpacity(1, 0.38)).toBe(1);
    expect(wordOpacity(0.5, 0.38)).toBeCloseTo(0.69);
  });
});
