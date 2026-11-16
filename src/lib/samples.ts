import { readFileSync } from "node:fs";
import path from "node:path";

import { samples, type SampleMeta } from "@/content/samples";
import { parseSpeech, type ParsedSpeech } from "@/lib/speech/blocks";

const SAMPLES_DIR = path.join(process.cwd(), "src", "content", "samples");

export interface Sample extends SampleMeta {
  speech: ParsedSpeech;
}

function load(meta: SampleMeta): Sample {
  const markdown = readFileSync(path.join(SAMPLES_DIR, `${meta.slug}.md`), "utf8");
  return { ...meta, speech: parseSpeech(markdown) };
}

/**
 * Returns the sample for a slug, or null if there is no such sample.
 * The slug is matched against the known list before any file is read, so a
 * slug from the URL can never be used to read an arbitrary file.
 */
export function getSample(slug: string): Sample | null {
  const meta = samples.find((sample) => sample.slug === slug);
  return meta ? load(meta) : null;
}

export function getAllSamples(): Sample[] {
  return samples.map(load);
}
