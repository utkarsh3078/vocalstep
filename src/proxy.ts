import { NextResponse, type NextRequest } from "next/server";

import { samples } from "@/content/samples";

const sampleSlugs = new Set(samples.map((sample) => sample.slug));

/**
 * Runs before a matched route renders.
 *
 * With Cache Components, a page's static shell is sent with a 200 status
 * before the page can check its params, so an unknown sample address would
 * show the not-found screen with the wrong status. Checking the slug here
 * returns a real 404.
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2];

  if (slug && !sampleSlugs.has(slug)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/samples/:path*",
};
