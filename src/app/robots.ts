import type { MetadataRoute } from "next";

import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/account", "/dashboard", "/history", "/create", "/speeches/", "/library", "/reset-password"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
