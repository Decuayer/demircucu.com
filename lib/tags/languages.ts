import { canonicalize } from "./normalize";

/** Minimum share of a repository's bytes for a non-primary language to become a tag. */
export const LANGUAGE_THRESHOLD = 0.1;

/** GitHub linguist names that are build files or markup, not skills (canonical form). */
const IGNORED = new Set([
  "tex",
  "makefile",
  "cmake",
  "dockerfile",
  "batchfile",
  "procfile",
  "powershell",
  "roff",
  "nix",
]);

/**
 * Languages of a repository that become `LANGUAGE` tags (task 2.2, approved): the primary
 * language always, the others when their byte share reaches LANGUAGE_THRESHOLD. Returns
 * linguist names (resolved to tags by the caller), primary first, then by share, without
 * ignored names or duplicates.
 */
export function selectRepoLanguages(
  primary: string | null | undefined,
  bytes: Readonly<Record<string, number>> | null | undefined,
): string[] {
  const total = Object.values(bytes ?? {}).reduce((sum, n) => sum + Math.max(0, n), 0);
  const ranked = Object.entries(bytes ?? {})
    .filter(([, n]) => total > 0 && n / total >= LANGUAGE_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of primary ? [primary, ...ranked] : ranked) {
    const key = canonicalize(name);
    if (!key || IGNORED.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
