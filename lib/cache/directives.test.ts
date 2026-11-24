// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every cached function that carries a cache tag must use the shared ("remote") cache.
 *
 * The default `"use cache"` handler is in-memory per server instance and tracks tag expirations
 * locally. On Vercel the admin action and the public page regeneration can run on different
 * instances, so with in-memory entries the page was re-rendered from stale data and stayed stale
 * at the CDN for hours (measured on the Phase 2 Preview: 2 of 4 edits). `"use cache: remote"`
 * uses the platform's shared cache, where `updateTag` expires the entry for every instance.
 */
const DATA_DIR = join(process.cwd(), "lib/data");

function cachedFunctions(source: string): { name: string; directive: string; tagged: boolean }[] {
  const out = [];
  const re = /export async function (\w+)[^{]*\{\s*"(use cache[^"]*)";([\s\S]*?)\n\}/g;
  for (const m of source.matchAll(re)) {
    out.push({ name: m[1]!, directive: m[2]!, tagged: m[3]!.includes("cacheTag(") });
  }
  return out;
}

describe("cache directives", () => {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".ts") && !f.includes(".test."));
  const all = files.flatMap((f) =>
    cachedFunctions(readFileSync(join(DATA_DIR, f), "utf8")).map((fn) => ({ file: f, ...fn })),
  );

  it("finds the cached data functions", () => {
    expect(all.filter((fn) => fn.tagged).length).toBeGreaterThanOrEqual(10);
  });

  it.each(all.filter((fn) => fn.tagged))("$file $name uses the shared cache", ({ directive }) => {
    expect(directive).toBe("use cache: remote");
  });
});
