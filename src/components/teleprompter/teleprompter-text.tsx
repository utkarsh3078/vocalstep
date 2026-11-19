import { memo } from "react";

import type { LanguageCode } from "@/config/practice";
import type { SpeechBlock } from "@/lib/speech/blocks";

/**
 * The speech as the teleprompter shows it. Every spoken word is its own
 * element marked `data-word`, in speech order, so the teleprompter can measure
 * where each word sits on screen. Headings carry no words.
 *
 * Memoised: the teleprompter re-renders several times a second to update the
 * clock, and this list can hold thousands of words.
 */
export const TeleprompterText = memo(function TeleprompterText({
  blocks,
  language,
}: {
  blocks: SpeechBlock[];
  language: LanguageCode;
}) {
  return (
    <div lang={language}>
      {blocks.map((block, index) =>
        block.type === "heading" ? (
          <h2
            key={index}
            // Full text colour, not the light colour the words start with.
            className="mt-[1.5em] mb-[0.5em] text-[0.7em] font-semibold tracking-wide text-[rgb(var(--tp-text))] uppercase opacity-60 first:mt-0"
          >
            {block.text}
          </h2>
        ) : (
          <p key={index} className="mb-[1em]">
            {block.words.map((word, wordIndex) => (
              <span key={wordIndex} data-word="">
                {word}{" "}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
});
