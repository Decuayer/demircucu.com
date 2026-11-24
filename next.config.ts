import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { assertPreviewIsolation } from "./lib/env/preview-guard";
import { buildSecurityHeaders } from "./lib/security/headers";

// A Preview build configured with production Supabase credentials fails here, before it can
// prerender pages from (or deploy against) production data.
assertPreviewIsolation();

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const securityHeaders = buildSecurityHeaders({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  isDev: process.env.NODE_ENV === "development",
  isPreview: process.env.VERCEL_ENV === "preview",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Integrity hashes on script tags; the CSP cannot use nonces with a static shell.
    sri: { algorithm: "sha256" },
    // One database connection per build worker (lib/db/pool-config.ts); bound the pages each
    // worker renders concurrently so they queue on that connection instead of timing out.
    staticGenerationMaxConcurrency: 4,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
