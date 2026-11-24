import { ZodError } from "zod";
import { AuthorizationError } from "@/lib/auth/errors";
import { UnknownMediaError } from "@/lib/media/usage-errors";

/**
 * Error codes returned by server actions. They are i18n keys under `errors.*`; the client
 * translates them. Internal details (Prisma, Supabase, stack traces) never reach the browser.
 */
export const ACTION_ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "invalidInput",
  "notFound",
  "conflict",
  "rateLimited",
  "invalidCredentials",
  "emailNotConfirmed",
  "weakPassword",
  "unsupportedType",
  "tooLarge",
  "mediaInUse",
  "serverError",
] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[number];

export type FieldErrors = Record<string, string[]>;

export type ActionFailure = {
  success?: false;
  error: ActionErrorCode;
  fieldErrors?: FieldErrors;
};
export type ActionSuccess<T> = { success: true; error?: undefined } & T;
export type ActionResult<T extends object = object> = ActionSuccess<T> | ActionFailure;

export function ok(): ActionSuccess<object>;
export function ok<T extends object>(data: T): ActionSuccess<T>;
export function ok<T extends object>(data?: T): ActionSuccess<T | object> {
  return { success: true, ...(data ?? {}) };
}

export function fail(error: ActionErrorCode, fieldErrors?: FieldErrors): ActionFailure {
  return fieldErrors ? { error, fieldErrors } : { error };
}

function isPrismaKnownError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Maps any thrown value to a safe failure. Unexpected errors are logged server-side with a
 * label and reported to the client as `serverError` only.
 */
export function toActionFailure(error: unknown, label: string): ActionFailure {
  if (error instanceof AuthorizationError) return fail(error.code);
  if (error instanceof ZodError) return fail("invalidInput", flattenZodError(error));
  if (error instanceof UnknownMediaError) return fail("invalidInput");
  if (isPrismaKnownError(error, "P2002")) return fail("conflict");
  // Foreign key violation: a media path or relation that does not exist.
  if (isPrismaKnownError(error, "P2003")) return fail("invalidInput");
  if (isPrismaKnownError(error, "P2025")) return fail("notFound");
  console.error(`[action:${label}]`, error);
  return fail("serverError");
}

export function flattenZodError(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
