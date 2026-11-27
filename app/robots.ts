import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env/app-url";

/**
 * Production: everything public is crawlable; admin, API, sign-in and profile pages are not
 * (they are also noindex). Any other deployment (Vercel Preview, local) disallows everything so
 * staging content never gets indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  const production = process.env.VERCEL_ENV === "production";
  if (!production) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/admin", "/*/auth", "/*/profile"],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}
