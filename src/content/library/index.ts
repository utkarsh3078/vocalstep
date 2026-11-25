import type { SampleMeta } from "@/content/samples";

/** Groups for the library page, in the order they are shown. */
export const libraryCategories = {
  study: "Study skills",
  education: "Education",
  space: "Space",
  ai: "Artificial intelligence",
  rag: "RAG and AI search",
} as const;

export type LibraryCategory = keyof typeof libraryCategories;

export interface LibraryMeta extends SampleMeta {
  category: LibraryCategory;
}

/**
 * The ready-made speeches signed-in users can practise, beyond the 3 public
 * samples. Written by hand (no AI request), about 5 minutes each.
 * To add one, write `<slug>.md` in this folder and add an entry here. A slug
 * must not match a public sample's: both are tracked as samples.
 */
export const librarySpeeches: readonly LibraryMeta[] = [
  {
    slug: "how-to-study-smarter",
    title: "How to Study Smarter, Not Longer",
    summary: "Why re-reading fools us, and how testing yourself and spacing your study make memories last.",
    category: "study",
    language: "en",
    minutes: 5,
  },
  {
    slug: "deep-focus-while-studying",
    title: "Finding Deep Focus While You Study",
    summary: "What constant switching costs you, and simple ways to protect your attention.",
    category: "study",
    language: "en",
    minutes: 5,
  },
  {
    slug: "technology-in-the-classroom",
    title: "How Technology Is Changing the Classroom",
    summary: "Learning without walls, at your own pace, and why teachers still matter most.",
    category: "education",
    language: "en",
    minutes: 5,
  },
  {
    slug: "ai-as-a-study-partner",
    title: "Using AI as a Study Partner, Not a Shortcut",
    summary: "How to ask AI to explain, quiz and review, so the learning stays yours.",
    category: "education",
    language: "en",
    minutes: 5,
  },
  {
    slug: "why-we-explore-space",
    title: "Why We Explore Space",
    summary: "Curiosity, everyday technology, a clearer view of Earth, and the dreams it inspires.",
    category: "space",
    language: "en",
    minutes: 5,
  },
  {
    slug: "life-on-the-space-station",
    title: "A Day on the International Space Station",
    summary: "Sixteen sunrises a day, floating meals, and how astronauts stay strong.",
    category: "space",
    language: "en",
    minutes: 5,
  },
  {
    slug: "how-ai-language-models-work",
    title: "How AI Language Models Work",
    summary: "Next-word prediction, training on huge amounts of text, and why AI still makes mistakes.",
    category: "ai",
    language: "en",
    minutes: 5,
  },
  {
    slug: "what-is-rag",
    title: "What Is RAG? An Open-Book Exam for AI",
    summary: "How retrieval-augmented generation lets AI answer from real, up-to-date documents.",
    category: "rag",
    language: "en",
    minutes: 5,
  },
  {
    slug: "building-a-rag-system",
    title: "Building a RAG System, Step by Step",
    summary: "From cleaning documents and chunking to embeddings, retrieval and testing.",
    category: "rag",
    language: "en",
    minutes: 5,
  },
  {
    slug: "embeddings-and-vector-search",
    title: "Embeddings and Vector Search, Simply Explained",
    summary: "How computers search by meaning, with text placed on a giant map.",
    category: "rag",
    language: "en",
    minutes: 5,
  },
];
