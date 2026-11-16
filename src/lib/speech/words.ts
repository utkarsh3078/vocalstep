/** A token counts as a word only if it has at least one letter or digit, in any script. */
const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u;

/**
 * Splits text into the words a person would speak.
 *
 * Tokens are separated by whitespace, so this works for English and for
 * Devanagari alike. A token made only of punctuation (a lone dash or danda)
 * is not a word: it is attached to the neighbouring word so it still shows
 * on screen but is never counted or tracked on its own.
 */
export function splitWords(text: string): string[] {
  const words: string[] = [];
  let leadingPunctuation = "";

  for (const token of text.split(/\s+/u)) {
    if (token === "") continue;

    if (HAS_WORD_CHARACTER.test(token)) {
      words.push(leadingPunctuation + token);
      leadingPunctuation = "";
    } else if (words.length > 0) {
      words[words.length - 1] += ` ${token}`;
    } else {
      leadingPunctuation += `${token} `;
    }
  }

  return words;
}

export function countWords(text: string): number {
  return splitWords(text).length;
}
