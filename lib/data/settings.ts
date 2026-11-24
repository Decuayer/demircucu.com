import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Site settings for public pages.
 *
 * Wrapped in React `cache` so that `generateMetadata`, the layout and the page share one query
 * per request instead of each opening a database round trip.
 */
export const getSiteSettings = cache(async () => {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    if (settings) return settings;

    // First run on an empty database: create the default row. upsert avoids a unique
    // violation when concurrent requests race to create it.
    return await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: {},
      create: { id: "main" },
    });
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return null;
  }
});
