import { describe, expect, it } from "vitest";
import { filterProjects, type ListableProject, type ProjectQuery } from "./list";

interface Item extends ListableProject {
  name: string;
}

const item = (name: string, overrides: Partial<Item> = {}): Item => ({
  name,
  primaryLanguage: null,
  featured: false,
  order: 0,
  stars: 0,
  pushedAt: null,
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const items: Item[] = [
  item("Çanta Mağazası", {
    primaryLanguage: "PHP",
    order: 2,
    stars: 1,
    pushedAt: "2026-03-01T00:00:00Z",
  }),
  item("Aegis", {
    primaryLanguage: "TypeScript",
    order: 1,
    featured: true,
    stars: 5,
    pushedAt: "2026-09-01T00:00:00Z",
  }),
  item("Manual site", { order: 0, updatedAt: "2026-10-01T00:00:00Z" }),
  item("LLM", { primaryLanguage: "Python", order: 3, stars: 5, pushedAt: "2026-10-15T00:00:00Z" }),
];

const query = (patch: Partial<ProjectQuery> = {}): ProjectQuery => ({
  lang: null,
  q: "",
  sort: "featured",
  ...patch,
});
const names = (list: Item[]) => list.map((i) => i.name);
const run = (patch: Partial<ProjectQuery>) =>
  names(filterProjects(items, query(patch), (i) => i.name));

describe("filterProjects", () => {
  it("puts featured projects first, then the admin's order", () => {
    expect(run({})).toEqual(["Aegis", "Manual site", "Çanta Mağazası", "LLM"]);
  });

  it("sorts by last push (or edit for manual projects)", () => {
    expect(run({ sort: "updated" })).toEqual(["LLM", "Manual site", "Aegis", "Çanta Mağazası"]);
  });

  it("sorts by stars, ties by last push", () => {
    expect(run({ sort: "stars" })).toEqual(["LLM", "Aegis", "Çanta Mağazası", "Manual site"]);
  });

  it("filters by language", () => {
    expect(run({ lang: "PHP" })).toEqual(["Çanta Mağazası"]);
    expect(run({ lang: "Rust" })).toEqual([]);
  });

  it("searches without case or diacritics", () => {
    expect(run({ q: "  canta " })).toEqual(["Çanta Mağazası"]);
    expect(run({ q: "MAĞAZA" })).toEqual(["Çanta Mağazası"]);
    expect(run({ q: "aegis", lang: "PHP" })).toEqual([]);
  });

  it("does not mutate the input", () => {
    const before = names(items);
    filterProjects(items, query({ sort: "stars" }), (i) => i.name);
    expect(names(items)).toEqual(before);
  });
});
