import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

/**
 * The locale comes from the `[locale]` root segment via `next/root-params`, which also works
 * inside `"use cache"` (the root param becomes part of the cache key). An explicit locale passed
 * to `getTranslations({ locale })` takes precedence.
 */
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const candidate = explicitLocale ?? (await rootLocale());
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
