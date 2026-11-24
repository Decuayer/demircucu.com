import { z } from "zod";
import { email, requiredText } from "./common";

/**
 * Server-side password policy. Mirrors the Supabase Auth settings documented in
 * docs/security-review.md (minimum length 10, lower/upper case letters and digits). 72 bytes is
 * the bcrypt limit Supabase enforces.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: "passwordTooShort" })
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    error: "passwordTooLong",
  })
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), {
    error: "passwordTooWeak",
  });

export const signInSchema = z.object({
  email,
  // No policy on sign-in: existing accounts may predate it. Only bound the size.
  password: z.string().min(1).max(256),
});

export const signUpSchema = z
  .object({
    name: requiredText(80),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "passwordMismatch",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "passwordMismatch",
  });

export const updateProfileSchema = z.object({ name: requiredText(80) });

export const localeSchema = z.enum(["tr", "en"]);
