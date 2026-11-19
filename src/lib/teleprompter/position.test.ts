import { describe, expect, it } from "vitest";

import {
  groupLines,
  offsetFor,
  groupRuns,
  positionAt,
  positionForWord,
  scrollSpeedAt,
  totalWords,
  wordIndexAt,
  type TextLine,
} from "./position";

const LINE_HEIGHT = 40;

/** Three lines of 4, 3 and 5 words; a heading-sized gap before the third. */
const lines: TextLine[] = [
  { center: 100, firstWord: 0, wordCount: 4 },
  { center: 140, firstWord: 4, wordCount: 3 },
  { center: 260, firstWord: 7, wordCount: 5 },
];

describe("groupLines", () => {
  it("puts consecutive words with the same centre on one line", () => {
    expect(groupLines([10, 10, 10, 50, 50, 90])).toEqual([
      { center: 10, firstWord: 0, wordCount: 3 },
      { center: 50, firstWord: 3, wordCount: 2 },
      { center: 90, firstWord: 5, wordCount: 1 },
    ]);
  });

  it("tolerates sub-pixel differences within a line", () => {
    expect(groupLines([10, 10.4, 11.5, 30])).toHaveLength(2);
  });

  it("returns no lines for no words", () => {
    expect(groupLines([])).toEqual([]);
  });
});

describe("positionAt", () => {
  it("is 0 above the first line", () => {
    expect(positionAt(lines, 0, LINE_HEIGHT)).toBe(0);
  });

  it("is the first word at the top of the first line's band", () => {
    expect(positionAt(lines, 80, LINE_HEIGHT)).toBe(0);
  });

  it("moves evenly through the words of a line", () => {
    expect(positionAt(lines, 100, LINE_HEIGHT)).toBe(2);
    expect(positionAt(lines, 90, LINE_HEIGHT)).toBe(1);
  });

  it("holds at the next line's first word in a gap between lines", () => {
    expect(positionAt(lines, 200, LINE_HEIGHT)).toBe(7);
    expect(positionAt(lines, 239, LINE_HEIGHT)).toBe(7);
  });

  it("reaches the total word count below the last line", () => {
    expect(positionAt(lines, 1000, LINE_HEIGHT)).toBe(12);
  });

  it("is 0 with no lines", () => {
    expect(positionAt([], 500, LINE_HEIGHT)).toBe(0);
  });
});

describe("offsetFor", () => {
  it("is the inverse of positionAt for every word", () => {
    for (let word = 0; word < 12; word += 1) {
      const position = positionForWord(word, 12);
      expect(positionAt(lines, offsetFor(lines, position, LINE_HEIGHT), LINE_HEIGHT)).toBeCloseTo(
        position,
        9,
      );
    }
  });

  it("puts a word back on the same word after a re-layout", () => {
    // The same 12 words wrapped differently, as after a font size change.
    const relaid: TextLine[] = [
      { center: 50, firstWord: 0, wordCount: 2 },
      { center: 110, firstWord: 2, wordCount: 2 },
      { center: 170, firstWord: 4, wordCount: 3 },
      { center: 330, firstWord: 7, wordCount: 2 },
      { center: 390, firstWord: 9, wordCount: 3 },
    ];
    const before = positionAt(lines, offsetFor(lines, positionForWord(8, 12), LINE_HEIGHT), LINE_HEIGHT);
    const after = positionAt(relaid, offsetFor(relaid, before, 60), 60);

    expect(wordIndexAt(before, 12)).toBe(8);
    expect(wordIndexAt(after, 12)).toBe(8);
  });

  it("clamps positions outside the speech", () => {
    expect(offsetFor(lines, -5, LINE_HEIGHT)).toBe(80);
    expect(offsetFor(lines, 99, LINE_HEIGHT)).toBe(280);
  });

  it("is 0 with no lines", () => {
    expect(offsetFor([], 3, LINE_HEIGHT)).toBe(0);
  });
});

describe("wordIndexAt", () => {
  it("rounds a position down to its word", () => {
    expect(wordIndexAt(3.9, 12)).toBe(3);
  });

  it("stays within the speech", () => {
    expect(wordIndexAt(-1, 12)).toBe(0);
    expect(wordIndexAt(12, 12)).toBe(11);
    expect(wordIndexAt(5, 0)).toBe(0);
  });
});

describe("positionForWord", () => {
  it("restores to the middle of a word, or the very start for the first", () => {
    expect(positionForWord(0, 12)).toBe(0);
    expect(positionForWord(5, 12)).toBe(5.5);
  });

  it("clamps a word index past the end", () => {
    expect(positionForWord(40, 12)).toBe(11.5);
  });
});

describe("totalWords", () => {
  it("counts words across lines", () => {
    expect(totalWords(lines)).toBe(12);
    expect(totalWords([])).toBe(0);
  });
});

describe("groupRuns", () => {
  it("joins touching lines into one paragraph and splits at gaps", () => {
    expect(groupRuns(lines, LINE_HEIGHT)).toEqual([
      { top: 80, bottom: 160, wordCount: 7 },
      { top: 240, bottom: 280, wordCount: 5 },
    ]);
  });

  it("returns no runs for no lines", () => {
    expect(groupRuns([], LINE_HEIGHT)).toEqual([]);
  });
});

describe("scrollSpeedAt", () => {
  const runs = groupRuns(lines, LINE_HEIGHT);
  const GAP_SPEED = 80;

  it("moves a paragraph's words past the line at exactly the reading speed", () => {
    // First run: 80 px for 7 words. At 60 wpm, one word a second.
    expect(scrollSpeedAt(runs, 100, 60, GAP_SPEED)).toBeCloseTo(80 / 7, 9);
    // Second run: 40 px for 5 words, at 120 wpm (two words a second).
    expect(scrollSpeedAt(runs, 250, 120, GAP_SPEED)).toBeCloseTo(16, 9);
  });

  it("takes words / wpm minutes to cross a whole paragraph", () => {
    const run = runs[0];
    const seconds = (run.bottom - run.top) / scrollSpeedAt(runs, run.top, 130, GAP_SPEED);
    expect(seconds).toBeCloseTo((run.wordCount / 130) * 60, 9);
  });

  it("uses the gap speed between paragraphs and outside the text", () => {
    expect(scrollSpeedAt(runs, 200, 130, GAP_SPEED)).toBe(GAP_SPEED);
    expect(scrollSpeedAt(runs, 10, 130, GAP_SPEED)).toBe(GAP_SPEED);
    expect(scrollSpeedAt(runs, 900, 130, GAP_SPEED)).toBe(GAP_SPEED);
    expect(scrollSpeedAt([], 100, 130, GAP_SPEED)).toBe(GAP_SPEED);
  });
});
