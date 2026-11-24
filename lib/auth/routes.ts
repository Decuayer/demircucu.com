import { routing } from "@/i18n/routing";

/** Paths that require a signed-in user; matched after the locale prefix. */
const PROTECTED_PREFIXES = ["/admin", "/profile"] as const;

/** Splits `/tr/admin/x` into `{ locale: "tr", path: "/admin/x" }`. */
export function splitLocale(pathname: string): { locale: string | null; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: `/${rest.join("/")}`.replace(/\/$/, "") || "/" };
  }
  return { locale: null, path: pathname || "/" };
}

export function isProtectedPath(pathname: string): boolean {
  const { path } = splitLocale(pathname);
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Supabase SSR stores the session in `sb-<ref>-auth-token` (optionally chunked `.0`, `.1`). */
export function hasSupabaseAuthCookie(names: Iterable<string>): boolean {
  for (const name of names) {
    if (/^sb-.+-auth-token(\.\d+)?$/.test(name)) return true;
  }
  return false;
}

/**
 * Validates a post-auth redirect target. Only same-site paths under a known locale are allowed;
 * anything else (absolute URLs, `//evil.test`, backslashes) falls back to the locale home.
 */
export function safeNextPath(next: string | null | undefined, locale: string): string {
  const fallback = `/${locale}`;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  try {
    const url = new URL(next, "http://internal.invalid");
    if (url.origin !== "http://internal.invalid") return fallback;
    const { locale: nextLocale } = splitLocale(url.pathname);
    if (!nextLocale) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
