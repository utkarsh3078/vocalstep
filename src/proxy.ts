import { NextResponse, type NextRequest } from "next/server";

import { librarySpeeches } from "@/content/library";
import { samples } from "@/content/samples";
import { isProtectedPath, loginHref } from "@/lib/auth/redirect";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

const sampleSlugs = new Set(samples.map((sample) => sample.slug));
const librarySlugs = new Set(librarySpeeches.map((speech) => speech.slug));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs before every page request.
 *
 * 1. Unknown sample and library addresses, and speech addresses that are not UUIDs, get a
 *    real 404. With Cache Components a page's static shell is sent with a 200
 *    status before the page can check its params, so this check happens here.
 *    (A well-formed id the user cannot see still shows the not-found page.)
 * 2. The Supabase session is refreshed when the visitor has one.
 * 3. Signed-out visitors to a page that needs an account go to the login page,
 *    which brings them back afterwards. Pages check the session again on the
 *    server; this is only the fast first check.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/samples/")) {
    const slug = pathname.split("/")[2];
    if (slug && !sampleSlugs.has(slug)) {
      return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    }
  }

  if (pathname.startsWith("/library/")) {
    const slug = pathname.split("/")[2];
    if (slug && !librarySlugs.has(slug)) {
      return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    }
  }

  // Speech addresses are UUIDs; anything else cannot exist.
  if (pathname.startsWith("/speeches/")) {
    const id = pathname.split("/")[2];
    if (id && !UUID.test(id)) {
      return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    }
  }

  const { response, signedIn } = await updateSession(request);

  if (!signedIn && isProtectedPath(pathname)) {
    return redirectWithCookies(new URL(loginHref(pathname + search), request.url), response);
  }

  return response;
}

export const config = {
  // Every page, but not Next's own files, images or the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
