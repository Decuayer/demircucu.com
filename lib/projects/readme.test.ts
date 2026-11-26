import { describe, expect, it } from "vitest";
import {
  demoteReadmeTitles,
  languageColor,
  languageShares,
  localizeReadmeHtml,
  readmeHeadings,
} from "./readme";

describe("localizeReadmeHtml", () => {
  it("prefixes document links with the locale and leaves other links alone", () => {
    const html =
      '<a href="/projects/a/docs/1" data-document="">x</a><a href="https://github.com/projects/">y</a><a href="#top">z</a>';
    expect(localizeReadmeHtml(html, "tr")).toBe(
      '<a href="/tr/projects/a/docs/1" data-document="">x</a><a href="https://github.com/projects/">y</a><a href="#top">z</a>',
    );
  });
});

describe("readmeHeadings", () => {
  it("lists h2 and h3 with ids, without anchors, tags or footnote headings", () => {
    const html = [
      '<h1 id="title">Title</h1>',
      '<h2 id="install">Install <code>npm</code><a class="heading-anchor" aria-hidden="true" href="#install">#</a></h2>',
      '<h3 id="q-a">Q &amp; A &#x1F680; &#38; &quot;x&quot; &lt;y&gt;</h3>',
      '<h2 class="sr-only" id="user-content-footnote-label">Footnotes</h2>',
      '<h2 id="empty"><a class="heading-anchor" href="#empty">#</a></h2>',
      "<h2>No id</h2>",
    ].join("\n");
    expect(readmeHeadings(html)).toEqual([
      { id: "install", text: "Install npm", level: 2 },
      { id: "q-a", text: 'Q & A 🚀 & "x" <y>', level: 3 },
    ]);
  });

  it("handles a missing README", () => {
    expect(readmeHeadings(null)).toEqual([]);
    expect(readmeHeadings("")).toEqual([]);
  });
});

describe("languages", () => {
  it("uses GitHub colours for known languages and a stable colour otherwise", () => {
    expect(languageColor("TypeScript")).toBe("#3178c6");
    expect(languageColor("Zig")).toBe(languageColor("Zig"));
    expect(languageColor("Zig")).toMatch(/^hsl\(\d+ 55% 55%\)$/);
  });

  it("computes shares, largest first, grouping languages under 1%", () => {
    expect(
      languageShares({ CSS: 100, TypeScript: 9_850, Shell: 30, Dockerfile: 20 }, "Diğer"),
    ).toEqual([
      { name: "TypeScript", percent: 98.5, color: "#3178c6" },
      { name: "CSS", percent: 1, color: "#563d7c" },
      { name: "Diğer", percent: 0.5, color: "#8b949e" },
    ]);
  });

  it("ignores empty or malformed input", () => {
    expect(languageShares(null)).toEqual([]);
    expect(languageShares("x")).toEqual([]);
    expect(languageShares({})).toEqual([]);
    expect(languageShares({ A: 0, B: "12" })).toEqual([]);
  });
});

describe("demoteReadmeTitles", () => {
  it("turns README h1 into marked h2 so the page keeps a single h1", () => {
    expect(demoteReadmeTitles('<h1 id="x">Title</h1><h2>Sub</h2><h1>Two</h1>')).toBe(
      '<h2 data-readme-h1 id="x">Title</h2><h2>Sub</h2><h2 data-readme-h1>Two</h2>',
    );
    expect(demoteReadmeTitles("<h10>not a heading</h10>")).toBe("<h10>not a heading</h10>");
  });
});
