import type { Duration, LanguageCode } from "@/config/practice";

export interface SampleMeta {
  /** Used in the URL and as the markdown file name in this folder. */
  slug: string;
  title: string;
  summary: string;
  language: LanguageCode;
  minutes: Duration;
}

/**
 * The pre-written speeches anyone can practise without an account.
 * To add one, write `<slug>.md` in this folder and add an entry here.
 */
export const samples: readonly SampleMeta[] = [
  {
    slug: "small-daily-habits",
    title: "Why Small Daily Habits Matter",
    summary: "How tiny actions, repeated every day, quietly shape who we become.",
    language: "en",
    minutes: 5,
  },
  {
    slug: "how-the-internet-works",
    title: "How the Internet Works",
    summary: "The journey of a photo across the world, explained in simple words.",
    language: "en",
    minutes: 5,
  },
  {
    slug: "reading-every-day",
    title: "The Power of Reading Every Day",
    summary: "Why ten minutes with a book builds your words, focus and empathy.",
    language: "en",
    minutes: 5,
  },
];
