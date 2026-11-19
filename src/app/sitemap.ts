import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { samples } from "@/content/samples";

/**
 * Public pages only. Account pages, the teleprompter and generated speeches
 * are private or duplicate content, and are kept out (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${site.url}${path}`,
    changeFrequency: "monthly",
    priority,
  });

  return [
    page("/", 1),
    ...samples.map((sample) => page(`/samples/${sample.slug}`, 0.8)),
    page("/signup", 0.6),
    page("/about", 0.5),
    page("/privacy", 0.3),
    page("/terms", 0.3),
    page("/contact", 0.3),
  ];
}
