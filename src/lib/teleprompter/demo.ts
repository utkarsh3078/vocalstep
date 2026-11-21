import type { SpeechBlock } from "@/lib/speech/blocks";

/**
 * The teleprompter demo on the home page: a short excerpt of a sample speech,
 * read word by word on a loop. Pure helpers, unit-tested.
 */

/** The opening blocks of a speech, up to the paragraph that reaches `minWords` spoken words. */
export function excerptBlocks(blocks: readonly SpeechBlock[], minWords: number): SpeechBlock[] {
  const excerpt: SpeechBlock[] = [];
  for (const block of blocks) {
    excerpt.push(block);
    if (block.type === "paragraph" && block.startWordIndex + block.words.length >= minWords) break;
  }
  // A heading with nothing after it would end the demo on a signpost.
  while (excerpt.at(-1)?.type === "heading") excerpt.pop();
  return excerpt;
}

/** Spoken words in an excerpt (headings carry none). */
export function excerptWordCount(blocks: readonly SpeechBlock[]): number {
  const last = blocks.findLast((block) => block.type === "paragraph");
  return last?.type === "paragraph" ? last.startWordIndex + last.words.length : 0;
}

/** Word indexes that end a paragraph, where the reader takes a breath. */
export function paragraphEnds(blocks: readonly SpeechBlock[]): Set<number> {
  const ends = new Set<number>();
  for (const block of blocks) {
    if (block.type === "paragraph") ends.add(block.startWordIndex + block.words.length - 1);
  }
  return ends;
}

/** How long the demo stays on a word before moving on, in milliseconds. */
export function demoDelay(
  index: number,
  wpm: number,
  wordCount: number,
  ends: ReadonlySet<number>,
  restartPauseMs = 2000,
): number {
  if (index >= wordCount - 1) return restartPauseMs;
  const perWord = 60_000 / Math.max(1, wpm);
  return ends.has(index) ? perWord * 2 : perWord;
}
