/**
 * The word highlight: how dark and bold each word is shown, from the reading
 * position. A word is at its strongest when the reading point is at its
 * middle, and fades smoothly over a few words on either side. The position
 * moves continuously, so the highlight glides from word to word.
 */
export interface HighlightShape {
  /** Words ahead of the reading point start to darken this far out. */
  aheadWords: number;
  /** Words behind it fade back to light over this many words. */
  behindWords: number;
}

/** Smooth 0-to-1 easing, so the fade has no hard edges. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * How strongly word `wordIndex` is shown at fractional `position`:
 * 0 is plain light text, 1 is fully dark and bold.
 */
export function emphasis(wordIndex: number, position: number, shape: HighlightShape): number {
  // Positive when the word is behind the reading point, negative when ahead.
  const distance = position - (wordIndex + 0.5);
  const reach = distance >= 0 ? shape.behindWords : shape.aheadWords;
  if (reach <= 0) return 0;
  const t = 1 - Math.abs(distance) / reach;
  return t <= 0 ? 0 : smoothstep(t);
}

/** The first and last word that may be highlighted at `position`, or null if none. */
export function highlightRange(
  position: number,
  wordCount: number,
  shape: HighlightShape,
): [number, number] | null {
  if (wordCount <= 0) return null;
  const first = Math.max(0, Math.floor(position - 0.5 - shape.behindWords));
  const last = Math.min(wordCount - 1, Math.ceil(position - 0.5 + shape.aheadWords));
  return first <= last ? [first, last] : null;
}

/** Opacity for a word with the given emphasis, between `dimOpacity` and 1. */
export function wordOpacity(strength: number, dimOpacity: number): number {
  return dimOpacity + (1 - dimOpacity) * Math.min(1, Math.max(0, strength));
}
