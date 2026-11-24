import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/routes";

const OTP_TYPES: ReadonlySet<string> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Landing point for every Supabase e-mail link and OAuth redirect.
 *
 * - `?token_hash=...&type=...` (recommended e-mail templates, works across devices): verifyOtp.
 * - `?code=...` (PKCE, default templates and OAuth): exchangeCodeForSession; needs the code
 *   verifier cookie, so it only works in the browser that started the flow.
 *
 * On success the session cookies are set and the visitor continues to `next` (validated, same
 * site, under a locale). Failures go to the login page with a generic message.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/[locale]/auth/callback">,
) {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"), locale);
  const failure = NextResponse.redirect(
    new URL(`/${locale}/auth/login?error=callback`, url.origin),
  );

  const supabase = createClient(await cookies());
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) return failure;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure;
  } else {
    return failure;
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
