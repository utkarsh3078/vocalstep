import type { LanguageCode } from "@/config/practice";

import { outlinePrompt } from "./prompts";
import {
  AIError,
  type ExtendRequest,
  type OutlineRequest,
  type SectionRequest,
  type SpeechWriter,
  type StreamChunk,
} from "./types";

/**
 * A stand-in writer for development and tests: no network, no API key, no
 * cost. It streams plain placeholder text that says what it is.
 *
 * Put a marker in the topic to simulate a case (mock mode only):
 *   [refuse]  the topic check rejects the topic (as politics)
 *   [block]   the safety filter blocks the outline
 *   [busy]    the provider is over its rate limit
 *   [invalid] the outline reply is unusable
 *   [error]   the second section fails part-way through
 *   [short]   the first section comes back short, so it is extended
 *   [bad]     the first try at the first section is a bullet list, so it is rewritten
 */
export const MOCK_MARKERS = ["[refuse]", "[block]", "[busy]", "[invalid]", "[error]", "[short]", "[bad]"] as const;

const SENTENCES: Record<LanguageCode, string[]> = {
  en: [
    "This is placeholder text from the mock writer, standing in for a real speech about {topic}.",
    "Real speeches are written only when the app runs with the Gemini provider.",
    "Read these words aloud anyway, at a steady and comfortable pace.",
    "Pause briefly at each full stop, and take a breath before a new idea.",
    "Notice how the teleprompter keeps the current line in the band.",
    "Speaking every day, even for a few minutes, builds confidence.",
    "Try to sound as if you are explaining {topic} to a friend.",
    "Keep your shoulders relaxed and let your voice carry to the end of each sentence.",
  ],
  hi: [
    "यह मॉक लेखक का नमूना पाठ है, जो {topic} पर असली भाषण की जगह लिखा गया है।",
    "असली भाषण तभी लिखे जाते हैं जब ऐप जेमिनी के साथ चलता है।",
    "फिर भी इन शब्दों को आराम से और साफ़ आवाज़ में पढ़िए।",
    "हर पूर्ण विराम पर थोड़ा रुकिए और नई बात से पहले साँस लीजिए।",
    "देखिए कि टेलीप्रॉम्प्टर मौजूदा पंक्ति को पट्टी में कैसे रखता है।",
    "हर दिन कुछ मिनट बोलने से भी आत्मविश्वास बढ़ता है।",
    "ऐसे बोलिए जैसे आप किसी दोस्त को यह विषय समझा रहे हों।",
    "कंधे ढीले रखिए और हर वाक्य के अंत तक आवाज़ बनाए रखिए।",
  ],
};

const WORDS_PER_PARAGRAPH = 70;
const WORDS_PER_CHUNK = 6;

/** About `words` words of placeholder text, in paragraphs. */
export function mockText(topic: string, language: LanguageCode, words: number, offset = 0): string {
  const sentences = SENTENCES[language];
  const paragraphs: string[] = [];
  let paragraph: string[] = [];
  let count = 0;
  let index = offset;

  while (count < words) {
    const sentence = sentences[index % sentences.length].replace("{topic}", topic);
    paragraph.push(sentence);
    count += sentence.split(/\s+/).length;
    index += 1;
    if (paragraph.join(" ").split(/\s+/).length >= WORDS_PER_PARAGRAPH) {
      paragraphs.push(paragraph.join(" "));
      paragraph = [];
    }
  }
  if (paragraph.length > 0) paragraphs.push(paragraph.join(" "));
  return paragraphs.join("\n\n");
}

const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/** The topic without simulation markers, as it would appear in a real speech. */
function plainTopic(topic: string): string {
  return MOCK_MARKERS.reduce((text, marker) => text.replaceAll(marker, ""), topic).replace(/\s+/g, " ").trim();
}

export function createMockWriter({ delayMs = 15 }: { delayMs?: number } = {}): SpeechWriter {
  const has = (topic: string, marker: (typeof MOCK_MARKERS)[number]) => topic.toLowerCase().includes(marker);
  let firstSectionTries = 0;

  async function* stream(text: string, failAfterWords?: number): AsyncIterable<StreamChunk> {
    const words = text.split(/(?<=\s)/);
    for (let start = 0; start < words.length; start += WORDS_PER_CHUNK) {
      if (failAfterWords !== undefined && start >= failAfterWords) {
        throw new AIError("failed", "Mock failure part-way through a section");
      }
      await sleep(delayMs);
      yield { type: "text", text: words.slice(start, start + WORDS_PER_CHUNK).join("") };
    }
    yield { type: "usage", usage: { input: 400, output: Math.ceil(words.length * 1.3) } };
  }

  return {
    model: "mock",

    async outline(request: OutlineRequest) {
      await sleep(delayMs * 10);
      const { topic } = request;
      if (has(topic, "[block]")) throw new AIError("blocked", "Mock safety block");
      if (has(topic, "[busy]")) throw new AIError("rate_limited", "Mock rate limit");
      if (has(topic, "[invalid]")) throw new AIError("invalid_output", "Mock unusable outline");

      const usage = { input: Math.ceil(outlinePrompt(request).length / 4), output: 120 };
      if (has(topic, "[refuse]")) {
        return { outline: { verdict: "rejected", reason: "politics", title: "", sections: [] }, usage };
      }

      const subject = plainTopic(topic);
      const sections = Array.from({ length: request.sectionCount }, (_, index) => ({
        heading:
          index === 0
            ? "Getting started"
            : index === request.sectionCount - 1
              ? "Bringing it together"
              : `Part ${index + 1}`,
        goal: `Section ${index + 1} of a practice speech about ${subject}.`,
      }));
      return {
        outline: { verdict: "ok", reason: "none", title: `Practice speech: ${subject}`, sections },
        usage,
      };
    },

    section(request: SectionRequest) {
      const { topic, language, index } = request;
      const target = request.outline[index].words;
      const subject = plainTopic(topic);

      if (index === 0 && has(topic, "[bad]") && firstSectionTries++ === 0) {
        return stream(`- ${subject} is important\n- It affects daily life\n- Remember these points`);
      }
      const words = index === 0 && has(topic, "[short]") ? Math.round(target * 0.5) : target;
      const failAfter = index === 1 && has(topic, "[error]") ? 30 : undefined;
      return stream(mockText(subject, language, words, index * 3), failAfter);
    },

    extend(request: ExtendRequest) {
      return stream(mockText(plainTopic(request.topic), request.language, request.missingWords, 5));
    },
  };
}
