import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Element } from "hast";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { beforeAll, describe, expect, it } from "vitest";
import {
  noAssets,
  renderReadme,
  type ReadmeAssets,
  type ReadmeRefs,
  type ResolvedImage,
} from "./render";

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");

const ctx = (repo: string) => ({
  owner: "Decuayer",
  repo,
  branch: "main",
  readmePath: "README.md",
});

/** Mirrors every image to a fake bucket URL; `links` stay unmirrored (too large). */
function fakeResolver(options: { links?: string[]; documents?: Record<string, string> } = {}) {
  const seen: ReadmeRefs[] = [];
  const resolve = async (refs: ReadmeRefs): Promise<ReadmeAssets> => {
    seen.push(refs);
    const images = new Map<string, ResolvedImage>();
    for (const image of refs.images) {
      const file = image.url.split("/").pop()!;
      images.set(
        image.url,
        options.links?.some((l) => image.url.endsWith(l))
          ? { kind: "link", href: `https://github.com/orig/${file}` }
          : {
              kind: "mirrored",
              src: `https://cdn.test/media/github/x/${file}`,
              path: `github/x/${file}`,
              width: 800,
              height: 600,
            },
      );
    }
    return { images, documents: new Map(Object.entries(options.documents ?? {})) };
  };
  return { resolve, seen };
}

/**
 * The first render creates Shiki's highlighter (regex engine, themes, grammars), which takes
 * several seconds on a cold CI runner with coverage on. Pay it once here, under its own timeout,
 * instead of inside the 5 s budget of whichever test happens to run first.
 */
beforeAll(async () => {
  await renderReadme("```ts\nconst a = 1;\n```\n```bash\nls\n```", ctx("warmup"), noAssets);
}, 60_000);

describe("renderReadme: aegis-dispatch fixture", () => {
  it("renders badges, mirrored images, alerts, mermaid, tables, tasks and documents", async () => {
    const { resolve, seen } = fakeResolver({
      documents: {
        "docs/design-report.pdf": "/projects/aegis-dispatch/docs/d1",
        "docs/user-manual.pdf": "/projects/aegis-dispatch/docs/d2",
      },
    });
    const out = await renderReadme(fixture("aegis-dispatch.md"), ctx("aegis-dispatch"), resolve);

    expect(seen[0]!.images.map((i) => i.url)).toEqual([
      "https://raw.githubusercontent.com/Decuayer/aegis-dispatch/main/docs/images/architecture.png",
    ]);
    expect(seen[0]!.documents.map((d) => d.repoPath)).toEqual([
      "docs/design-report.pdf",
      "docs/user-manual.pdf",
    ]);

    const html = out.html;
    // Badges stay on their hosts, without a referrer.
    expect(html).toContain('src="https://img.shields.io/badge/TypeScript-5-blue"');
    expect(html).toContain(
      'src="https://github.com/Decuayer/aegis-dispatch/actions/workflows/ci.yml/badge.svg"',
    );
    expect(html).toContain('referrerpolicy="no-referrer"');
    // Mirrored image with its intrinsic size.
    expect(html).toContain('src="https://cdn.test/media/github/x/architecture.png"');
    expect(html).toMatch(
      /architecture\.png" alt="Architecture" width="800" height="600" loading="lazy" decoding="async"/,
    );
    expect(out.mediaPaths).toEqual(["github/x/architecture.png"]);
    // Emoji shortcode.
    expect(html).toContain("🚨");
    // Alerts.
    expect(html).toContain('<div class="markdown-alert markdown-alert-note">');
    expect(html).toContain('<div class="markdown-alert markdown-alert-warning">');
    expect(html).not.toContain("[!NOTE]");
    // Two mermaid diagrams, left for the client.
    expect(out.hasMermaid).toBe(true);
    expect(html.match(/data-mermaid/g)).toHaveLength(2);
    expect(html).toContain("stateDiagram-v2");
    // Tables scroll; task lists; strikethrough.
    expect(html).toContain('<div class="table-wrapper"><table>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("<del>Voice</del>");
    // PDFs go to the site viewer, relative files to GitHub, anchors match heading ids.
    expect(html).toContain('href="/projects/aegis-dispatch/docs/d1" data-document=""');
    expect(html).toContain('href="/projects/aegis-dispatch/docs/d2" data-document=""');
    expect(html).toContain(
      'href="https://github.com/Decuayer/aegis-dispatch/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer"',
    );
    expect(html).toContain('<h2 id="installation">');
    expect(html).toContain('href="#installation"');
    // Highlighted code with light and dark colours.
    expect(html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(html).toContain("--shiki-dark:");
  });

  it("is stable", async () => {
    const { resolve } = fakeResolver({
      documents: { "docs/user-manual.pdf": "/projects/a/docs/d2" },
    });
    const out = await renderReadme(fixture("aegis-dispatch.md"), ctx("aegis-dispatch"), resolve);
    expect(out.html).toMatchSnapshot();
  });
});

describe("renderReadme: HTML images", () => {
  it("handles <img>, <picture>, raw links, theme fragments and attachments", async () => {
    const { resolve, seen } = fakeResolver({ links: ["huge.png"] });
    const out = await renderReadme(fixture("html-images.md"), ctx("demo"), resolve);
    const html = out.html;

    const urls = seen[0]!.images.map((i) => i.url);
    expect(urls).toContain("https://raw.githubusercontent.com/Decuayer/demo/main/images/logo.png");
    expect(urls).toContain(
      "https://raw.githubusercontent.com/Decuayer/demo/main/images/banner-dark.png",
    );
    expect(urls).toContain("https://raw.githubusercontent.com/Decuayer/demo/main/images/raw.png");
    expect(urls).toContain(
      "https://github.com/user-attachments/assets/aaaabbbb-1111-4222-8333-444455556666",
    );

    // <img width> keeps the author's width; height follows the ratio.
    expect(html).toMatch(/logo\.png" alt="Logo" width="120" height="90"/);
    // <picture> becomes one image per theme.
    expect(html).toMatch(/banner-light\.png"[^>]*class="gh-light-only"/);
    expect(html).toMatch(/banner-dark\.png"[^>]*class="gh-dark-only"/);
    expect(html).not.toContain("<picture");
    expect(html).not.toContain("<source");
    // #gh-dark-mode-only fragment.
    expect(html).toMatch(/diagram\.png"[^>]*class="gh-dark-only"/);
    // Bare attachment URL stays a link; uploaded <img> is mirrored.
    expect(html).toContain(
      'href="https://github.com/user-attachments/assets/0d3a1c2b-1111-4222-8333-444455556666"',
    );
    expect(html).toContain(
      'src="https://cdn.test/media/github/x/aaaabbbb-1111-4222-8333-444455556666"',
    );
    // Too large: a link to the original instead of an image.
    expect(html).toContain(
      '<a href="https://github.com/orig/huge.png" target="_blank" rel="noopener noreferrer" class="readme-image-link">Huge</a>',
    );
    expect(out.mediaPaths).not.toContain("github/x/huge.png");
  });

  it("links every image when nothing is mirrored", async () => {
    const out = await renderReadme("![a](a.png)", ctx("demo"), noAssets);
    expect(out.html).toContain('href="https://raw.githubusercontent.com/Decuayer/demo/main/a.png"');
    expect(out.html).not.toContain("<img");
  });
});

describe("renderReadme: XSS", () => {
  it("removes scripts, handlers, unsafe URLs and active elements", async () => {
    const { resolve } = fakeResolver();
    const { html } = await renderReadme(fixture("xss.md"), ctx("demo"), resolve);

    // Checked on the parsed output: escaped text such as "&lt;img onerror" is harmless.
    const tree = unified().use(rehypeParse, { fragment: true }).parse(html);
    const banned = new Set([
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "meta",
      "base",
      "style",
      "math",
      "svg",
    ]);
    visit(tree, "element", (node: Element) => {
      // Only the alert icons are SVG, and this fixture has none.
      expect(banned.has(node.tagName), node.tagName).toBe(false);
      for (const [name, value] of Object.entries(node.properties)) {
        expect(name.toLowerCase().startsWith("on"), name).toBe(false);
        expect(name, "style").not.toBe("style");
        if (["href", "src", "srcSet", "action", "formAction"].includes(name)) {
          expect(String(value).trim().toLowerCase()).not.toMatch(/^(javascript|data|vbscript):/);
        }
      }
    });
    // Author ids are prefixed so they cannot clobber page globals.
    expect(html).toContain('id="user-content-__proto__"');
    // The texts survive.
    expect(html).toContain("click");
    expect(html).toContain("md link");
    expect(html).toContain("styled");
  });
});

describe("renderReadme: details", () => {
  it("points footnote links at the prefixed ids", async () => {
    const { html } = await renderReadme("Text[^1].\n\n[^1]: Note.", ctx("demo"), noAssets);
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('id="user-content-fn-1"');
    expect(html).toContain('href="#user-content-fnref-1"');
  });

  it("highlights unknown languages as plain text", async () => {
    const { html } = await renderReadme("```notalanguage\nx\n```", ctx("demo"), noAssets);
    expect(html).toContain("<pre");
    expect(html).toContain(">x<");
  });

  it("keeps an alert's text after the marker line", async () => {
    const { html } = await renderReadme("> [!TIP]\n> Use **pnpm**.", ctx("demo"), noAssets);
    expect(html).toContain("markdown-alert-tip");
    expect(html).toContain("<strong>pnpm</strong>");
  });

  it("leaves normal blockquotes alone", async () => {
    const { html } = await renderReadme("> just a quote", ctx("demo"), noAssets);
    expect(html).toContain("<blockquote>");
  });
});
