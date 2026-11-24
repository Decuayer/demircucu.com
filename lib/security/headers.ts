/**
 * Security headers and Content Security Policy (security review S10).
 *
 * No nonces: with Cache Components / PPR the static shell is rendered at build time, where no
 * per-request nonce exists, and App Router emits inline `self.__next_f.push(...)` scripts whose
 * content changes with every page. `script-src` therefore allows `'self'` and inline scripts;
 * external chunks are pinned with Subresource Integrity (`experimental.sri`). The policy still
 * blocks third-party scripts, plugins, framing, `<base>` and form hijacking, and limits where
 * images and fetches may go. Stored XSS is prevented by the HTML sanitizer (S4).
 */
export interface SecurityHeaderOptions {
  supabaseUrl?: string;
  isDev: boolean;
  /** Vercel Preview: allow the Vercel toolbar (comments, feedback). */
  isPreview: boolean;
}

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy({
  supabaseUrl,
  isDev,
  isPreview,
}: SecurityHeaderOptions): string {
  const supabase = origin(supabaseUrl);
  const vercelLive = isPreview ? ["https://vercel.live"] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...vercelLive],
    "style-src": ["'self'", "'unsafe-inline'", ...vercelLive],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      ...(supabase ? [supabase] : []),
      "https://avatars.githubusercontent.com",
      ...(isPreview ? ["https://vercel.live", "https://vercel.com"] : []),
    ],
    "font-src": [
      "'self'",
      ...(isPreview ? ["https://vercel.live", "https://assets.vercel.com"] : []),
    ],
    "connect-src": [
      "'self'",
      ...(supabase ? [supabase] : []),
      ...(isDev ? ["ws:", "wss:"] : []),
      ...(isPreview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : []),
    ],
    "frame-src": isPreview ? ["https://vercel.live"] : ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'", ...(supabase ? [supabase] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function buildSecurityHeaders(
  options: SecurityHeaderOptions,
): { key: string; value: string }[] {
  const headers = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  if (!options.isDev) {
    // Two years; subdomains included. `preload` is left to the owner (hard to undo).
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}
