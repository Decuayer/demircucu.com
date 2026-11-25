import type { NextConfig } from "next";

type ImagesConfig = NonNullable<NextConfig["images"]>;
type RemotePattern = NonNullable<ImagesConfig["remotePatterns"]>[number];

/** Hosts whose loopback or private addresses are fine to fetch (local Supabase in dev and E2E). */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * `next/image` configuration. Only the media bucket of the configured Supabase project is an
 * optimizer source (plus GitHub avatars), so `/_next/image` cannot be used to fetch and resize
 * arbitrary URLs. Media paths are content-addressed or random and never change, so optimised
 * variants may be cached for a long time.
 */
export function buildImagesConfig(supabaseUrl: string | undefined): ImagesConfig {
  const patterns: RemotePattern[] = [
    { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/u/**" },
  ];
  let local = false;
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      local = LOCAL_HOSTS.has(url.hostname);
      patterns.unshift({
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/storage/v1/object/public/media/**",
      });
    } catch {
      // Invalid URL: no storage pattern; mediaUrl() returns null for the same input.
    }
  }

  return {
    remotePatterns: patterns,
    formats: ["image/avif", "image/webp"],
    // Content widths: 1280 is the widest container (max-w-7xl); 2x for high-density phones.
    deviceSizes: [640, 750, 828, 1080, 1280, 1920, 2560],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    qualities: [75],
    // 31 days; sources are immutable (see lib/supabase/storage.ts).
    minimumCacheTTL: 2_678_400,
    // The local Supabase API listens on 127.0.0.1; production never sets a local URL.
    ...(local ? { dangerouslyAllowLocalIP: true } : {}),
  };
}
