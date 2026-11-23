/**
 * Helper to get translatable field from a database object
 * @param obj The database object (e.g., Project, Experience)
 * @param field The base field name (e.g., 'title', 'description')
 * @param locale The current locale ('tr' or 'en')
 * @returns The translated string or a fallback
 */
export function getTranslated(
  obj: object | null | undefined,
  field: string,
  locale: string,
): string {
  if (!obj) return "";
  const record = obj as Record<string, unknown>;
  const read = (key: string): string =>
    typeof record[key] === "string" ? (record[key] as string) : "";

  // Try suffixed fields first (e.g., titleTr, titleEn)
  const suffix = locale.charAt(0).toUpperCase() + locale.slice(1); // 'Tr' or 'En'
  const current = read(`${field}${suffix}`);
  if (current) return current;

  // Fallback to the other language if current one is empty
  const otherSuffix = locale === "tr" ? "En" : "Tr";
  const other = read(`${field}${otherSuffix}`);
  if (other) return other;

  // Final fallback to the base field name if it exists (for backward compatibility during migration)
  return read(field);
}

/**
 * Formats a date consistently for server and client to avoid hydration mismatches
 * @param date The date to format
 * @returns Formatted date string (DD.MM.YYYY)
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
