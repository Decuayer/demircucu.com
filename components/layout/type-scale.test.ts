import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard for the type scale and the 4/8px spacing system (phase 8) on public pages: no half
 * spacing steps (2, 6, 10, 14px), no arbitrary font sizes, and page and section headings only on
 * the scale's steps. The admin panel, sign-in and profile pages and shadcn primitives are out of
 * scope.
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

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const rel = relative(ROOT, path);
    if (EXCLUDED.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [rel] : [];
  });
}

const FILES = SCOPES.flatMap((scope) => sourceFiles(join(ROOT, scope)));

/** Spacing utilities (padding, margin, gap, space-between) on a half step. */
const HALF_STEP =
  /(?<![\w-])(?:[a-z-]+:)*-?(?:p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|space-[xy])-(?:0\.5|1\.5|2\.5|3\.5)(?![\w.])/g;
const ARBITRARY_TEXT = /(?<![\w-])(?:[a-z-]+:)*text-\[\d[^\]]*\]/g;
const HEADING = /<(h[1-3])\b[^>]*className="([^"]*)"/g;
const SCALE = /(?<![\w-])(?:[a-z-]+:)*text-(?:display|h[1-4]|eyebrow|base|sm|xs)(?![\w-])/;

function findings(pattern: RegExp): string[] {
  return FILES.flatMap((file) =>
    [...readFileSync(join(ROOT, file), "utf8").matchAll(pattern)].map(
      (match) => `${file}: ${match[0]}`,
    ),
  );
}

describe("type scale and spacing guard", () => {
  it("scans the public pages", () => {
    expect(FILES).toContain("app/[locale]/client.tsx");
    expect(FILES).toContain("components/layout/page-header.tsx");
    expect(FILES.some((file) => file.startsWith("app/[locale]/admin"))).toBe(false);
  });

  it("uses whole 4px spacing steps", () => {
    expect(findings(HALF_STEP)).toEqual([]);
  });

  it("has no arbitrary font sizes", () => {
    expect(findings(ARBITRARY_TEXT)).toEqual([]);
  });

  it("sets headings on the type scale", () => {
    const offScale = FILES.flatMap((file) =>
      [...readFileSync(join(ROOT, file), "utf8").matchAll(HEADING)]
        .filter(([, , classes]) => !SCALE.test(classes!))
        .map(([, tag, classes]) => `${file}: <${tag} className="${classes}">`),
    );
    expect(offScale).toEqual([]);
  });

  it("page titles use the h1 or display step", () => {
    const titles = FILES.flatMap((file) =>
      [...readFileSync(join(ROOT, file), "utf8").matchAll(HEADING)]
        .filter(([, tag, classes]) => tag === "h1" && !/\btext-(?:h1|display)\b/.test(classes!))
        .map(([, , classes]) => `${file}: ${classes}`),
    );
    expect(titles).toEqual([]);
  });

  it("the patterns catch what they guard against", () => {
    expect('className="gap-1.5 md:py-0.5"'.match(HALF_STEP)).toEqual(["gap-1.5", "md:py-0.5"]);
    expect('className="h-3.5 w-2.5 top-0.5"'.match(HALF_STEP)).toBeNull();
    expect('className="text-[10px] text-[var(--x)]"'.match(ARBITRARY_TEXT)).toEqual([
      "text-[10px]",
    ]);
    expect(SCALE.test("mb-6 text-h2")).toBe(true);
    expect(SCALE.test("text-lg font-semibold")).toBe(false);
  });
});
