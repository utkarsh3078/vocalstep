import { readFileSync } from "node:fs";
import path from "node:path";

import { librarySpeeches, type LibraryMeta } from "@/content/library";
import { samples, type SampleMeta } from "@/content/samples";
import { parseSpeech, type ParsedSpeech } from "@/lib/speech/blocks";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

export interface Sample extends SampleMeta {
  speech: ParsedSpeech;
}

export interface LibrarySpeech extends LibraryMeta {
  speech: ParsedSpeech;
}

function load<T extends SampleMeta>(meta: T, folder: "samples" | "library"): T & { speech: ParsedSpeech } {
  const markdown = readFileSync(path.join(CONTENT_DIR, folder, `${meta.slug}.md`), "utf8");
  return { ...meta, speech: parseSpeech(markdown) };
}

/**
 * Returns the public sample for a slug, or null if there is no such sample.
 * The slug is matched against the known list before any file is read, so a
 * slug from the URL can never be used to read an arbitrary file.
 */
export function getSample(slug: string): Sample | null {
  const meta = samples.find((sample) => sample.slug === slug);
  return meta ? load(meta, "samples") : null;
}

export function getAllSamples(): Sample[] {
  return samples.map((meta) => load(meta, "samples"));
}

/** A library speech (signed-in users only) by slug, or null. Matched against the list first, as above. */
export function getLibrarySpeech(slug: string): LibrarySpeech | null {
  const meta = librarySpeeches.find((speech) => speech.slug === slug);
  return meta ? load(meta, "library") : null;
}

export function getAllLibrarySpeeches(): LibrarySpeech[] {
  return librarySpeeches.map((meta) => load(meta, "library"));
}

/** True for any ready-made speech that can be practised: a public sample or a library speech. */
export function isPractiseableSample(slug: string): boolean {
  return samples.some((sample) => sample.slug === slug) || librarySpeeches.some((speech) => speech.slug === slug);
}

/**
 * A ready-made speech found by the slug stored on a practice session, with its
 * pages. Public samples live under /samples, library speeches under /library.
 */
export function findPractisedSample(
  slug: string,
): { sample: Sample; pageHref: string; practiceHref: string } | null {
  const sample = getSample(slug);
  if (sample) {
    return { sample, pageHref: `/samples/${slug}`, practiceHref: `/samples/${slug}/practice` };
  }
  const speech = getLibrarySpeech(slug);
  if (speech) {
    return { sample: speech, pageHref: `/library/${slug}`, practiceHref: `/library/${slug}/practice` };
  }
  return null;
}
