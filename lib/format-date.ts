/**
 * Dates shown on public pages. Pages are prerendered on the server (UTC) and hydrated in the
 * visitor's browser (any time zone, any default locale); formatting must give the same text on
 * both sides or React reports a hydration mismatch (#418) and re-renders the page. So the locale
 * is always the page locale and the time zone is fixed to the site's.
 */
export const SITE_TIME_ZONE = "Europe/Istanbul";

const DEFAULT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export function formatDate(
  value: Date | string | number,
  locale: string,
  options: Intl.DateTimeFormatOptions = DEFAULT,
): string {
  return new Intl.DateTimeFormat(locale, { timeZone: SITE_TIME_ZONE, ...options }).format(
    new Date(value),
  );
}
