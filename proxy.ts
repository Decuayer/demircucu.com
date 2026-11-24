import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";
import { hasSupabaseAuthCookie, isProtectedPath, splitLocale } from "@/lib/auth/routes";

const handleI18nRouting = createIntlMiddleware(routing);

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Runs before every page request:
 * 1. Refreshes the Supabase session (rotating tokens are written back as cookies). Requests
 *    without a Supabase auth cookie skip this, so anonymous page views never wait on Auth.
 * 2. Redirects anonymous visitors away from /admin and /profile. This is a convenience only;
 *    the security boundary is `requireAdmin()` / `requireUser()` on the server.
 * 3. Locale detection and prefixing (next-intl).
 */
export async function proxy(request: NextRequest) {
  const cookiesToSet: CookieToSet[] = [];
  const headersToSet: Record<string, string> = {};
  let signedIn = false;

  if (hasSupabaseAuthCookie(request.cookies.getAll().map((cookie) => cookie.name))) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(list, headers) {
            for (const { name, value } of list) request.cookies.set(name, value);
            cookiesToSet.push(...list);
            // Cache-Control: private, no-store so a CDN never caches a response carrying tokens.
            Object.assign(headersToSet, headers);
          },
        },
      },
    );
    // getClaims verifies the JWT (locally with asymmetric signing keys, otherwise via the Auth
    // server) and refreshes an expired session.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  let response: NextResponse;
  if (!signedIn && isProtectedPath(request.nextUrl.pathname)) {
    const { locale } = splitLocale(request.nextUrl.pathname);
    const login = new URL(`/${locale ?? routing.defaultLocale}/auth/login`, request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    response = NextResponse.redirect(login);
  } else {
    response = handleI18nRouting(request);
  }

  for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
  for (const [key, value] of Object.entries(headersToSet)) response.headers.set(key, value);
  return response;
}

export const config = {
  // Every page route; not API routes, Next internals, Vercel internals or files with extensions.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
