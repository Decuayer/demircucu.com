/**
 * CSRF check for state-changing route handlers (server actions get the same check from Next).
 * The browser always sends `Origin` on cross-origin POSTs; it must name the host that received
 * the request (`x-forwarded-host` behind Vercel's proxy, `host` otherwise).
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
