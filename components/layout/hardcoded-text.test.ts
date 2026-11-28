import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard for user-facing text on public pages (phase 8): JSX text and the `placeholder`,
 * `aria-label`, `title` and `alt` attributes come from messages/*.json, not from the source.
 * Brand and product names are allowed. The admin panel, sign-in and profile pages and shadcn
 * primitives are out of scope.
 */

const ROOT = process.cwd();
const SCOPES = ["app/[locale]", "components"];
const EXCLUDED = [
  "app/[locale]/admin",
  "app/[locale]/auth",
  "app/[locale]/profile",
  "components/admin",
  "components/auth",
  "components/ui",
];
const ALLOWED = new Set([
  "GitHub",
  "LinkedIn",
  "Twitter / X",
  "Instagram",
  "YouTube",
  "Medium",
  "StackOverflow",
  "demircucu.com",
  "demircucu",
  ".com",
  "404",
  "X",
  // The contact form honeypot: hidden from people and screen readers, read only by bots.
  "Website",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const rel = relative(ROOT, path);
    if (EXCLUDED.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [rel] : [];
  });
}

/** Text between JSX tags, and text attributes, that contains letters. */
export function hardcodedText(source: string): string[] {
  const found: string[] = [];
  const code = source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  for (const [, text] of code.matchAll(/>([^<>{}]*?\p{L}[^<>{}]*?)</gu)) {
    const value = text!.trim().replace(/\s+/g, " ");
    // Generic type arguments and arrow functions also look like ">...<".
    if (!value || /[=;()|]|&&|=>|^[,.:]|[,:]$|\b(?:const|return|extends)\b/.test(value)) continue;
    if (!ALLOWED.has(value)) found.push(value);
  }
  for (const [, , value] of code.matchAll(
    /\b(placeholder|aria-label|title|alt)="([^"]*\p{L}[^"]*)"/gu,
  )) {
    if (!ALLOWED.has(value!)) found.push(value!);
  }
  return found;
}

describe("hardcoded text guard", () => {
  const files = SCOPES.flatMap((scope) => sourceFiles(join(ROOT, scope)));

  it("public pages take their text from the messages", () => {
    const findings = files.flatMap((file) =>
      hardcodedText(readFileSync(join(ROOT, file), "utf8")).map((text) => `${file}: ${text}`),
    );
    expect(findings).toEqual([]);
  });

  it("finds JSX text and text attributes, not code", () => {
    expect(
      hardcodedText(
        `<h2>Ekli Dosyalar</h2><Input placeholder="John Doe" /><p>{t("x")}</p>
         <span>GitHub</span><Foo<Bar> />{a > b && c < d}
         <h3>
           <Icon />
           Devamını Oku
         </h3>`,
      ),
    ).toEqual(["Ekli Dosyalar", "Devamını Oku", "John Doe"]);
  });
});
