/**
 * Cache Components requires `generateStaticParams` to return at least one entry. On an empty
 * database (fresh environment) a placeholder keeps the build working; the page renders
 * `notFound()` for it.
 */
export const EMPTY_PARAM_PLACEHOLDER = "__none__";

export function atLeastOne<T extends Record<string, string>>(params: T[], placeholder: T): T[] {
  return params.length > 0 ? params : [placeholder];
}
