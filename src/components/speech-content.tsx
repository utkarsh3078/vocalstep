import type { LanguageCode } from "@/config/practice";
import type { SpeechBlock } from "@/lib/speech/blocks";

/** The formatted, readable view of a speech: section headings and paragraphs. */
export function SpeechContent({
  blocks,
  language,
}: {
  blocks: SpeechBlock[];
  language: LanguageCode;
}) {
  return (
    <div lang={language} className="space-y-4 text-lg leading-8">
      {blocks.map((block, index) =>
        block.type === "heading" ? (
          <h2 key={index} className="pt-4 text-xl font-semibold">
            {block.text}
          </h2>
        ) : (
          <p key={index}>{block.words.join(" ")}</p>
        ),
      )}
    </div>
  );
}
