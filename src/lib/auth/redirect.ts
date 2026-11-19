import { auth } from "@/config/auth";

/** Pages that must never be the place a user is sent back to after signing in. */
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

/**
 * Checks a "return to" address taken from the URL or a form.
 *
 * Only an address on this site is allowed: it must start with a single "/".
 * Anything else ("https://evil.example", "//evil.example", "/\evil.example")
 * would let a crafted link send the user to another site after login, so it
 * falls back to the default page.
 */
export function safeNextPath(value: unknown, fallback: string = auth.defaultRedirect): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();

  if (path.length === 0 || path.length > 512) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  // Control characters (including tabs and newlines) can disguise "//".
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  const pathname = path.split(/[?#]/)[0];
  if (AUTH_PAGES.includes(pathname) || pathname.startsWith("/auth/")) return fallback;

  return path;
}

/** The login page, set to return the user to `next` afterwards. */
export function loginHref(next?: string): string {
  const target = safeNextPath(next, "");
  return target ? `/login?next=${encodeURIComponent(target)}` : "/login";
}

/** True when the path needs an account. */
export function isProtectedPath(pathname: string): boolean {
  return auth.protectedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
