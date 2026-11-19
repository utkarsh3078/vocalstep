import { z } from "zod";

/**
 * Public environment variables, safe to reach the browser.
 *
 * Read lazily, on first use, so the app builds before any keys exist. Each
 * variable is written out in full (`process.env.NEXT_PUBLIC_...`) because
 * Next.js only inlines public variables into browser code when written that way.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export class MissingEnvError extends Error {
  constructor(details: string) {
    super(`Supabase is not configured. Set the variables in .env.example. ${details}`);
    this.name = "MissingEnvError";
  }
}

function read() {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

let cached: PublicEnv | undefined;

/** The validated public variables. Throws MissingEnvError if any is missing or invalid. */
export function getPublicEnv(): PublicEnv {
  if (cached) return cached;
  const result = read();
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new MissingEnvError(`Problem with: ${fields}.`);
  }
  cached = result.data;
  return cached;
}

/** True when Supabase is configured. Lets pages explain instead of crashing. */
export function isSupabaseConfigured(): boolean {
  return read().success;
}
