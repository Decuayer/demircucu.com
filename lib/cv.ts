/** The CV to offer on a page: the page language's file, otherwise the other one. */
export function cvUrlFor(
  settings: { cvUrlTr?: string | null; cvUrlEn?: string | null } | null | undefined,
  locale: string,
): string | null {
  if (!settings) return null;
  const own = locale === "en" ? settings.cvUrlEn : settings.cvUrlTr;
  const other = locale === "en" ? settings.cvUrlTr : settings.cvUrlEn;
  return own || other || null;
}
