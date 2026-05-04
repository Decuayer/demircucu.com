/**
 * Helper to get translatable field from a database object
 * @param obj The database object (e.g., Project, Experience)
 * @param field The base field name (e.g., 'title', 'description')
 * @param locale The current locale ('tr' or 'en')
 * @returns The translated string or a fallback
 */
export function getTranslated(obj: any, field: string, locale: string): string {
  if (!obj) return "";
  
  // Try suffixed fields first (e.g., titleTr, titleEn)
  const suffix = locale.charAt(0).toUpperCase() + locale.slice(1); // 'Tr' or 'En'
  const suffixedField = `${field}${suffix}`;
  
  if (obj[suffixedField]) {
    return obj[suffixedField];
  }
  
  // Fallback to the other language if current one is empty
  const otherSuffix = locale === "tr" ? "En" : "Tr";
  const otherField = `${field}${otherSuffix}`;
  
  if (obj[otherField]) {
    return obj[otherField];
  }

  // Final fallback to the base field name if it exists (for backward compatibility during migration)
  return obj[field] || "";
}
