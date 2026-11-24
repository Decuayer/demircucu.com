/**
 * Tag normalisation (task 2.2). Pure functions, shared by the server (sync, actions, the tag
 * migration script) and the client (tag selector search).
 */

/** Spellings whose punctuation carries meaning and would be lost by the generic rules. */
const SPECIAL: Readonly<Record<string, string>> = {
  "c++": "cpp",
  "c#": "csharp",
  "f#": "fsharp",
  ".net": "dotnet",
  "asp.net": "aspnet",
  "node.js": "nodejs",
  "next.js": "nextjs",
  "vue.js": "vuejs",
  "nuxt.js": "nuxtjs",
  "react.js": "react",
  "express.js": "express",
};

const TURKISH: Readonly<Record<string, string>> = {
  ı: "i",
  ş: "s",
  ğ: "g",
  ü: "u",
  ö: "o",
  ç: "c",
};

/**
 * Canonical slug of a tag name, topic or alias: NFKC, Turkish-safe lower case, the special
 * spelling table, then ASCII letters / digits separated by single dashes. Returns `null` when
 * nothing is left (empty or punctuation-only input).
 */
export function canonicalize(input: string): string | null {
  // "İ".toLowerCase() yields "i" + a combining dot, so dotted and dotless capitals go first.
  const lower = input.normalize("NFKC").trim().replace(/İ/g, "i").replace(/I/g, "i").toLowerCase();
  const special = SPECIAL[lower];
  if (special) return special;
  const slug = lower
    .replace(/[ışğüöç]/g, (ch) => TURKISH[ch]!)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\+\+/g, "pp")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

/** A tag as far as resolution is concerned. */
export interface ResolvableTag {
  id: string;
  slug: string;
  aliases: readonly string[];
}

/** Lookup from slug and alias to tag, built once per batch of resolutions. */
export type TagIndex<T extends ResolvableTag = ResolvableTag> = ReadonlyMap<string, T>;

/**
 * Builds the slug / alias index. Slugs win over aliases if the data ever disagrees (the
 * database triggers prevent that), and the first tag wins for a duplicated alias.
 */
export function buildTagIndex<T extends ResolvableTag>(tags: readonly T[]): TagIndex<T> {
  const index = new Map<string, T>();
  for (const tag of tags) {
    for (const alias of tag.aliases) if (!index.has(alias)) index.set(alias, tag);
  }
  for (const tag of tags) index.set(tag.slug, tag);
  return index;
}

/**
 * Resolves free text (a GitHub topic, a typed tag, a language name) to a tag: by slug first,
 * then by alias, both compared in canonical form. `null` means no tag matches.
 */
export function resolveTag<T extends ResolvableTag>(index: TagIndex<T>, input: string): T | null {
  const key = canonicalize(input);
  if (!key) return null;
  return index.get(key) ?? null;
}

const UPPER_WORDS = new Set(["ai", "api", "ui", "ux", "sql", "nlp", "llm", "css", "html", "iot"]);

/**
 * Display name for a tag created from a bare topic ("machine-learning" -> "Machine Learning",
 * "rest-api" -> "Rest API"). Only a starting point; the admin renames tags that come out wrong.
 */
export function displayNameFromTopic(topic: string): string {
  return topic
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) =>
      UPPER_WORDS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
