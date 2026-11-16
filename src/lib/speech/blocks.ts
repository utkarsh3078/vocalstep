import { splitWords } from "./words";

/**
 * A speech is a list of blocks: section headings and paragraphs.
 *
 * Headings are signposts on screen and are not read aloud, so they carry no
 * words. Each paragraph knows the index of its first word within the whole
 * speech, which is how the teleprompter tracks position by word, not by pixel.
 */
export type SpeechBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; words: string[]; startWordIndex: number };

export interface ParsedSpeech {
  blocks: SpeechBlock[];
  /** Spoken words only; headings are excluded. */
  wordCount: number;
}

const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;
const LIST_ITEM = /^\s*(?:[-*+•]|\d+[.)])\s+(.*)$/;
const HORIZONTAL_RULE = /^\s*(?:[-*_]\s*){3,}$/;

/** Removes inline markdown that has no place in a script read aloud. */
function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*|__|`|\*/g, "").trim();
}

/**
 * Parses speech markdown into blocks.
 *
 * Speeches are meant to contain only "## " headings and paragraphs. AI output
 * does not always obey, so this is forgiving: any heading level is a heading,
 * list items become their own paragraphs, and bold, italic and code markers
 * are dropped.
 */
export function parseSpeech(markdown: string): ParsedSpeech {
  const blocks: SpeechBlock[] = [];
  let wordCount = 0;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const words = splitWords(stripInlineMarkdown(paragraphLines.join(" ")));
    paragraphLines = [];
    if (words.length === 0) return;
    blocks.push({ type: "paragraph", words, startWordIndex: wordCount });
    wordCount += words.length;
  };

  for (const line of markdown.split(/\r?\n/)) {
    if (line.trim() === "" || HORIZONTAL_RULE.test(line)) {
      flushParagraph();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      const text = stripInlineMarkdown(heading[1]);
      if (text !== "") blocks.push({ type: "heading", text });
      continue;
    }

    const listItem = LIST_ITEM.exec(line);
    if (listItem) {
      flushParagraph();
      paragraphLines.push(listItem[1]);
      flushParagraph();
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushParagraph();
  return { blocks, wordCount };
}
