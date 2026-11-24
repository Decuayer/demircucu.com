import { createHash } from "node:crypto";

/**
 * SHA-256 of the production Supabase project ref.
 *
 * Only the digest is stored so the repository never contains production connection details. When
 * the production project changes (e.g. the Frankfurt migration), add the new digest here:
 *   node -e 'console.log(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' <ref>
 */
export const PRODUCTION_REF_SHA256: readonly string[] = [
  "e2fe3aa20641a26983055e81265b4e58cf2ad0807f828d61237a8314531ce392",
];

const REF_PATTERN = /^[a-z0-9]{20}$/;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Extracts the Supabase project ref from a project URL (`https://<ref>.supabase.co`) or a
 * Postgres URL (`postgres.<ref>@...pooler.supabase.com`, `db.<ref>.supabase.co`).
 */
export function extractSupabaseRef(value: string | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname;
  const user = decodeURIComponent(url.username);
  const candidates = [
    /^([a-z0-9]+)\.supabase\.(co|in)$/.exec(host)?.[1],
    /^db\.([a-z0-9]+)\.supabase\.(co|in)$/.exec(host)?.[1],
    /^postgres\.([a-z0-9]+)$/.exec(user)?.[1],
  ];
  return candidates.find((ref): ref is string => !!ref && REF_PATTERN.test(ref)) ?? null;
}

export function isProductionRef(
  ref: string | null,
  productionDigests: readonly string[] = PRODUCTION_REF_SHA256,
): boolean {
  return ref !== null && productionDigests.includes(sha256(ref));
}
