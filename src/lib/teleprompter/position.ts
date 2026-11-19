/**
 * Maps between a reading position, measured in words, and a vertical offset
 * in the rendered text.
 *
 * A position is a fractional word index: 12.5 means halfway through word 12.
 * Within one line of text, the position moves evenly from the line's first
 * word to its last as the reading line passes through the line. Between lines
 * (paragraph gaps and headings) the position holds still. This lets the
 * teleprompter track the exact word at the reading line and put the same word
 * back after the text is re-laid out, without ever storing a pixel offset.
 */

/** One rendered line of spoken words. */
export interface TextLine {
  /** Vertical centre of the line's words, in pixels from the top of the text. */
  center: number;
  /** Index of the first word on the line, within the whole speech. */
  firstWord: number;
  /** How many words are on the line. Always at least 1. */
  wordCount: number;
}

/**
 * Groups measured word centres into lines. Words are given in reading order;
 * consecutive words whose centres are within `tolerance` pixels share a line.
 */
export function groupLines(wordCenters: readonly number[], tolerance = 2): TextLine[] {
  const lines: TextLine[] = [];

  wordCenters.forEach((center, index) => {
    const current = lines[lines.length - 1];
    if (current && Math.abs(center - current.center) <= tolerance) {
      current.wordCount += 1;
    } else {
      lines.push({ center, firstWord: index, wordCount: 1 });
    }
  });

  return lines;
}

/** Total words across all lines. */
export function totalWords(lines: readonly TextLine[]): number {
  const last = lines[lines.length - 1];
  return last ? last.firstWord + last.wordCount : 0;
}

/** Index of the last line whose band starts at or above `y`, or -1 if none does. */
function lineAtOrAbove(lines: readonly TextLine[], y: number, lineHeight: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].center - lineHeight / 2 <= y) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/** Index of the line holding the given word position (binary search). */
function lineOfPosition(lines: readonly TextLine[], position: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = 0;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].firstWord <= position) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * The word position at vertical offset `y` (the reading line), from 0 to the
 * total word count. Each line occupies a band of `lineHeight` pixels centred
 * on the line.
 */
export function positionAt(lines: readonly TextLine[], y: number, lineHeight: number): number {
  const index = lineAtOrAbove(lines, y, lineHeight);
  if (index < 0) return 0;

  const line = lines[index];
  const bandTop = line.center - lineHeight / 2;
  const fraction = lineHeight > 0 ? clamp((y - bandTop) / lineHeight, 0, 1) : 1;
  return line.firstWord + fraction * line.wordCount;
}

/**
 * The vertical offset at which `positionAt` returns `position`: the inverse of
 * `positionAt`. Used to put a word back on the reading line.
 */
export function offsetFor(lines: readonly TextLine[], position: number, lineHeight: number): number {
  if (lines.length === 0) return 0;

  const target = clamp(position, 0, totalWords(lines));
  const line = lines[lineOfPosition(lines, target)];
  const fraction = clamp((target - line.firstWord) / line.wordCount, 0, 1);
  return line.center - lineHeight / 2 + fraction * lineHeight;
}

/** The whole word at a position, from 0 to `wordCount - 1`. */
export function wordIndexAt(position: number, wordCount: number): number {
  if (wordCount <= 0) return 0;
  return clamp(Math.floor(position), 0, wordCount - 1);
}

/**
 * The position to restore a saved word index to. The middle of the word is
 * used so that rounding of the scroll offset cannot land on the word before.
 */
export function positionForWord(wordIndex: number, wordCount: number): number {
  if (wordIndex <= 0 || wordCount <= 0) return 0;
  return Math.min(wordIndex, wordCount - 1) + 0.5;
}

/** Adjacent lines with no gap between them: one paragraph on screen. */
export interface TextRun {
  /** Top of the first line's band. */
  top: number;
  /** Bottom of the last line's band. */
  bottom: number;
  wordCount: number;
}

/**
 * Groups lines into runs of touching line bands. A gap of more than a quarter
 * of a line (a paragraph break or a heading) starts a new run.
 */
export function groupRuns(lines: readonly TextLine[], lineHeight: number): TextRun[] {
  const runs: TextRun[] = [];

  for (const line of lines) {
    const top = line.center - lineHeight / 2;
    const bottom = line.center + lineHeight / 2;
    const current = runs[runs.length - 1];

    if (current && top - current.bottom <= lineHeight / 4) {
      current.bottom = bottom;
      current.wordCount += line.wordCount;
    } else {
      runs.push({ top, bottom, wordCount: line.wordCount });
    }
  }

  return runs;
}

/**
 * Auto-scroll speed, in pixels per second, with the reading line at `y`.
 *
 * Inside a paragraph the speed is that paragraph's height per word times the
 * reading speed, so its words pass the line at exactly `wpm` and the motion
 * stays steady. Between paragraphs (gaps and headings) there are no words to
 * read, so the text moves on at `gapSpeed`: a short, natural pause.
 */
export function scrollSpeedAt(
  runs: readonly TextRun[],
  y: number,
  wpm: number,
  gapSpeed: number,
): number {
  let low = 0;
  let high = runs.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    if (runs[middle].top <= y) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const run = runs[found];
  if (!run || y >= run.bottom || run.wordCount === 0 || wpm <= 0) return gapSpeed;
  return (wpm / 60) * ((run.bottom - run.top) / run.wordCount);
}
