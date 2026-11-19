import { NextResponse, type NextRequest } from "next/server";

import { samples } from "@/content/samples";
import { isProtectedPath, loginHref } from "@/lib/auth/redirect";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

const sampleSlugs = new Set(samples.map((sample) => sample.slug));

/**
 * Runs before every page request.
 *
 * 1. Unknown sample addresses get a real 404. With Cache Components a page's
 *    static shell is sent with a 200 status before the page can check its
 *    params, so this check has to happen here.
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
