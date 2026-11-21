import type { LanguageCode } from "@/config/practice";
import type { SpeechBlock } from "@/lib/speech/blocks";

/**
 * The formatted, readable view of a speech: section headings and paragraphs,
 * at a comfortable line length. Used on speech and sample pages and while a
 * speech is being written.
 */
export function SpeechContent({
  blocks,
  language,
}: {
  blocks: SpeechBlock[];
  language: LanguageCode;
}) {
  return (
    <div lang={language} className="max-w-[68ch] space-y-5 text-lg leading-8 text-ink-soft">
      {blocks.map((block, index) =>
        block.type === "heading" ? (
          <h2 key={index} className="pt-5 text-xl font-semibold tracking-tight text-ink first:pt-0">
            {block.text}
          </h2>
        ) : (
          <p key={index}>{block.words.join(" ")}</p>
        ),
      )}
    </div>
  );
}
