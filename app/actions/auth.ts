"use server";

import { cookies } from "next/headers";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { absoluteUrl } from "@/lib/env/app-url";
import { requireUser } from "@/lib/auth/guards";
import { clientIp, consumeAll, RATE_LIMITS } from "@/lib/rate-limit";
import {
  fail,
  ok,
  toActionFailure,
  type ActionFailure,
  type ActionResult,
} from "@/lib/actions/result";
import {
  forgotPasswordSchema,
  localeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";

/** Failed sign-ins take at least this long, which slows down online guessing. */
const FAILED_SIGN_IN_MIN_MS = 800;

async function supabase() {
  return createClient(await cookies());
}

function callbackUrl(locale: string, next: string): string {
  const params = new URLSearchParams({ next: `/${locale}${next}` });
  return absoluteUrl(`/${locale}/auth/callback?${params.toString()}`);
}

function mapAuthError(error: AuthError): ActionFailure {
  if (error.status === 429 || error.code === "over_request_rate_limit") return fail("rateLimited");
  if (error.code === "weak_password") return fail("weakPassword");
  return fail("serverError");
}

async function waitUntil(startedAt: number, minimumMs: number): Promise<void> {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

export async function signUp(
  input: unknown,
  localeInput: unknown,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  try {
    const locale = localeSchema.parse(localeInput);
    const data = signUpSchema.parse(input);
    const ip = await clientIp();
    const limit = await consumeAll([[RATE_LIMITS.registerPerIp, ip]]);
    if (!limit.allowed) return fail("rateLimited");

    const client = await supabase();
    const { data: result, error } = await client.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Read by the auth.users trigger that creates the profile (role is always USER).
        data: { name: data.name },
        emailRedirectTo: callbackUrl(locale, "/auth/confirmed"),
      },
    });
    if (error) return mapAuthError(error);

    // With e-mail confirmation on, Supabase returns no session (also for an already registered
    // address, so the response does not reveal whether the account exists).
    return ok({ needsConfirmation: !result.session });
  } catch (error) {
    return toActionFailure(error, "signUp");
  }
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const startedAt = Date.now();
  try {
    const data = signInSchema.parse(input);
    const ip = await clientIp();
    const limit = await consumeAll([
      [RATE_LIMITS.loginPerIp, ip],
      [RATE_LIMITS.loginPerAccountIp, `${data.email}|${ip}`],
      [RATE_LIMITS.loginPerAccount, data.email],
    ]);
    if (!limit.allowed) {
      await waitUntil(startedAt, FAILED_SIGN_IN_MIN_MS);
      return fail("rateLimited");
    }

    const client = await supabase();
    const { error } = await client.auth.signInWithPassword(data);
    if (error) {
      await waitUntil(startedAt, FAILED_SIGN_IN_MIN_MS);
      // Only reachable with the correct password, so it does not help account enumeration.
      if (error.code === "email_not_confirmed") return fail("emailNotConfirmed");
      if (error.status === 429) return fail("rateLimited");
      return fail("invalidCredentials");
    }
    return ok();
  } catch (error) {
    await waitUntil(startedAt, FAILED_SIGN_IN_MIN_MS);
    return toActionFailure(error, "signIn");
  }
}

export async function signOut(localeInput: unknown): Promise<void> {
  const parsed = localeSchema.safeParse(localeInput);
  const locale = parsed.success ? parsed.data : "tr";
  const client = await supabase();
  await client.auth.signOut();
  redirect({ href: "/", locale });
}

/** Always succeeds for valid input so the response never reveals whether an account exists. */
export async function requestPasswordReset(
  input: unknown,
  localeInput: unknown,
): Promise<ActionResult> {
  try {
    const locale = localeSchema.parse(localeInput);
    const { email } = forgotPasswordSchema.parse(input);
    const ip = await clientIp();
    const limit = await consumeAll([
      [RATE_LIMITS.passwordResetPerIp, ip],
      [RATE_LIMITS.passwordResetPerAccount, email],
    ]);
    if (!limit.allowed) return fail("rateLimited");

    const client = await supabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl(locale, "/auth/reset-password"),
    });
    if (error && error.status === 429) return fail("rateLimited");
    if (error) console.error("[action:requestPasswordReset]", error.code ?? error.status);
    return ok();
  } catch (error) {
    return toActionFailure(error, "requestPasswordReset");
  }
}

export async function resendConfirmation(
  input: unknown,
  localeInput: unknown,
): Promise<ActionResult> {
  try {
    const locale = localeSchema.parse(localeInput);
    const { email } = forgotPasswordSchema.parse(input);
    const ip = await clientIp();
    const limit = await consumeAll([
      [RATE_LIMITS.passwordResetPerIp, ip],
      [RATE_LIMITS.passwordResetPerAccount, email],
    ]);
    if (!limit.allowed) return fail("rateLimited");

    const client = await supabase();
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: callbackUrl(locale, "/auth/confirmed") },
    });
    if (error && error.status === 429) return fail("rateLimited");
    if (error) console.error("[action:resendConfirmation]", error.code ?? error.status);
    return ok();
  } catch (error) {
    return toActionFailure(error, "resendConfirmation");
  }
}

/**
 * Sets a new password for the signed-in user: from the reset page (recovery session created by
 * the auth callback) or from the profile page.
 */
export async function updatePassword(input: unknown): Promise<ActionResult> {
  try {
    const { password } = resetPasswordSchema.parse(input);
    const client = await supabase();
    const { data: userData } = await client.auth.getUser();
    if (!userData.user) return fail("unauthenticated");
    const { error } = await client.auth.updateUser({ password });
    if (error) return mapAuthError(error);
    return ok();
  } catch (error) {
    return toActionFailure(error, "updatePassword");
  }
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { name } = updateProfileSchema.parse(input);
    await prisma.profile.update({ where: { id: user.id }, data: { name } });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateProfile");
  }
}
