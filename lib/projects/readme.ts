/**
 * Helpers for rendering a stored README and repository metadata. Client-safe, pure.
 */

/** Document links are stored without a locale ("/projects/<slug>/docs/<id>"). */
export function localizeReadmeHtml(html: string, locale: string): string {
  return demoteReadmeTitles(html.replaceAll('href="/projects/', `href="/${locale}/projects/`));
}

/**
 * The project page already has the page `<h1>`; a README's own `# Title` becomes an `<h2>`
 * (marked `data-readme-h1` so it keeps its larger size), giving one `<h1>` per page.
 */
export function demoteReadmeTitles(html: string): string {
  return html
    .replace(/<h1(\s|>)/g, (_, next: string) => `<h2 data-readme-h1${next === ">" ? ">" : " "}`)
    .replaceAll("</h1>", "</h2>");
}

export interface ReadmeHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

const decodeEntities = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

/** h2 / h3 of the rendered README for the table of contents (footnote headings excluded). */
export function readmeHeadings(html: string | null | undefined): ReadmeHeading[] {
  if (!html) return [];
  const headings: ReadmeHeading[] = [];
  for (const match of html.matchAll(/<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const [, level, id, inner] = match;
    if (id!.startsWith("user-content-")) continue;
    const text = decodeEntities(
      inner!.replace(/<a class="heading-anchor"[\s\S]*?<\/a>/g, "").replace(/<[^>]+>/g, ""),
    ).trim();
    if (text) headings.push({ id: id!, text, level: Number(level) as 2 | 3 });
  }
  return headings;
}

/** Colours of common GitHub linguist languages; others get a stable generated colour. */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Go: "#00ADD8",
  Rust: "#dea584",
  Dart: "#00B4AB",
  PHP: "#4F5D95",
  Ruby: "#701516",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  "Jupyter Notebook": "#DA5B0B",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  QML: "#44a51c",
  CMake: "#DA3434",
  Dockerfile: "#384d54",
  TeX: "#3D6117",
  "Objective-C": "#438eff",
  Assembly: "#6E4C13",
  MATLAB: "#e16737",
  R: "#198CE7",
  SQL: "#e38c00",
  PLpgSQL: "#336790",
};

export function languageColor(name: string): string {
  const known = LANGUAGE_COLORS[name];
  if (known) return known;
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 55% 55%)`;
}

export interface LanguageShare {
  name: string;
  /** 0..100, one decimal. */
  percent: number;
  color: string;
}

/** Byte counts -> shares, largest first; languages under 1% are grouped as "Other". */
export function languageShares(languages: unknown, otherLabel = "Other"): LanguageShare[] {
  if (!languages || typeof languages !== "object") return [];
  const entries = Object.entries(languages as Record<string, unknown>).filter(
    (e): e is [string, number] => typeof e[1] === "number" && e[1] > 0,
  );
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return [];
  const shares: LanguageShare[] = [];
  let other = 0;
  for (const [name, bytes] of entries.sort((a, b) => b[1] - a[1])) {
    const percent = (bytes / total) * 100;
    if (percent < 1) other += percent;
    else shares.push({ name, percent: Math.round(percent * 10) / 10, color: languageColor(name) });
  }
  if (other > 0)
    shares.push({ name: otherLabel, percent: Math.round(other * 10) / 10, color: "#8b949e" });
  return shares;
}
