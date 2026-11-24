"use client";

import { useTranslations } from "next-intl";
import { ACTION_ERROR_CODES, type ActionErrorCode } from "./result";

const KNOWN = new Set<string>(ACTION_ERROR_CODES);

/** Translates an action error code; unknown values fall back to the generic message. */
export function useActionErrorMessage(): (code: string | undefined | null) => string {
  const t = useTranslations("errors");
  return (code) => t(code && KNOWN.has(code) ? (code as ActionErrorCode) : "serverError");
}
