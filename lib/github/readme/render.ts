/**
 * README render pipeline (task 1.3). Runs during the sync; the result is stored in
 * `Project.readmeHtml` and rendered as is.
 *
 *   markdown -> remark (GFM, emoji) -> rehype (raw HTML) -> sanitize (GitHub schema)
 *            -> collect images / PDF links -> resolve (mirror; caller) -> rewrite
 *            -> alerts, mermaid, footnote anchors -> slug, heading links -> shiki -> HTML
 *
 * Everything after the sanitizer only adds markup this module builds itself, so the output
 * cannot contain author-controlled scripts, event handlers, styles or unsafe URLs.
 */
import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import { toString } from "hast-util-to-string";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeShiki from "@shikijs/rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import {
  classifyImage,
  classifyLink,
  firstSrcsetUrl,
  themeOfImage,
  type ImageSource,
  type RepoContext,
} from "./urls";

/** Bump when the output changes; the sync re-renders READMEs produced by an older version. */
export const README_PIPELINE_VERSION = 1;

/** An image that has to be downloaded (repository file, attachment or external). */
export type MirrorableImage = Exclude<ImageSource, { kind: "badge" } | { kind: "invalid" }>;

export interface ReadmeRefs {
  images: MirrorableImage[];
  /** Repository paths of linked PDFs. */
  documents: { repoPath: string; githubUrl: string }[];
}

export type ResolvedImage =
  | { kind: "mirrored"; src: string; path: string; width: number | null; height: number | null }
  /** Not mirrored (too large, wrong type, download failed): shown as a link to the original. */
  | { kind: "link"; href: string };

export interface ReadmeAssets {
  /** Keyed by MirrorableImage.url. */
  images: Map<string, ResolvedImage>;
  /** Site URL ("/projects/<slug>/docs/<id>", locale added at render) by repository path. */
  documents: Map<string, string>;
}

export interface RenderedReadme {
  html: string;
  /** Storage paths of mirrored images, in order of appearance (gallery, MediaUsage). */
  mediaPaths: string[];
  hasMermaid: boolean;
}

/** GitHub's schema, plus the attributes `<picture>` / `<img>` sizing need. */
const schema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    source: [...(defaultSchema.attributes?.source ?? []), "media", "type"],
  },
};

const ALERTS = {
  note: {
    title: "Note",
    icon: "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z",
  },
  tip: {
    title: "Tip",
    icon: "M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z",
  },
  important: {
    title: "Important",
    icon: "M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  },
  warning: {
    title: "Warning",
    icon: "M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  },
  caution: {
    title: "Caution",
    icon: "M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z",
  },
} as const;

type AlertType = keyof typeof ALERTS;

const el = (
  tagName: string,
  properties: Element["properties"] = {},
  children: ElementContent[] = [],
): Element => ({ type: "element", tagName, properties, children });

const text = (value: string): Text => ({ type: "text", value });

const str = (value: unknown): string | null =>
  typeof value === "string" ? value : Array.isArray(value) ? value.map(String).join(" ") : null;

const classes = (node: Element): string[] => {
  const value: unknown = node.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" ? value.split(/\s+/) : [];
};

const addClass = (node: Element, ...names: string[]) => {
  node.properties.className = [...new Set([...classes(node), ...names])];
};

/** Parses and sanitises; the tree holds only what GitHub itself would allow. */
async function parse(markdown: string): Promise<Root> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGemoji)
    // Footnote ids get their prefix from the sanitizer (fixed up in fixAnchors).
    .use(remarkRehype, { allowDangerousHtml: true, clobberPrefix: "" })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema);
  return (await processor.run(processor.parse(markdown))) as Root;
}

function collectRefs(tree: Root, ctx: RepoContext): ReadmeRefs {
  const images = new Map<string, MirrorableImage>();
  const documents = new Map<string, { repoPath: string; githubUrl: string }>();
  const addImage = (src: string | null) => {
    const source = classifyImage(src, ctx);
    if (source.kind === "invalid" || source.kind === "badge") return;
    if (!images.has(source.url)) images.set(source.url, source);
  };
  visit(tree, "element", (node) => {
    if (node.tagName === "img") addImage(str(node.properties.src));
    if (node.tagName === "source") addImage(firstSrcsetUrl(str(node.properties.srcSet)));
    if (node.tagName === "a") {
      const target = classifyLink(str(node.properties.href), ctx);
      if (target.kind === "document" && !documents.has(target.repoPath)) {
        documents.set(target.repoPath, { repoPath: target.repoPath, githubUrl: target.githubUrl });
      }
    }
  });
  return { images: [...images.values()], documents: [...documents.values()] };
}

function fileName(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
}

const positive = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Rewrites one image. Returns the replacement node, or null to drop it. `mediaPaths` collects
 * mirrored paths in order.
 */
function rewriteImage(
  node: Element,
  src: string | null,
  theme: "light" | "dark" | null,
  ctx: RepoContext,
  assets: ReadmeAssets,
  mediaPaths: string[],
): ElementContent | null {
  const source = classifyImage(src, ctx);
  if (source.kind === "invalid") return null;
  const image = el("img", {
    src: source.kind === "badge" ? source.url : undefined,
    alt: str(node.properties.alt) ?? "",
    width: node.properties.width,
    height: node.properties.height,
    align: node.properties.align,
    title: node.properties.title,
    loading: "lazy",
    decoding: "async",
  });
  if (theme) addClass(image, theme === "dark" ? "gh-dark-only" : "gh-light-only");

  if (source.kind === "badge") {
    image.properties.referrerPolicy = "no-referrer";
    addClass(image, "readme-badge");
    return image;
  }

  const resolved = assets.images.get(source.url);
  if (!resolved || resolved.kind === "link") {
    const href = resolved?.href ?? source.url;
    const label = str(node.properties.alt) || fileName(source.url);
    const link = el("a", { href, target: "_blank", rel: ["noopener", "noreferrer"] }, [
      text(label),
    ]);
    addClass(link, "readme-image-link");
    return link;
  }

  image.properties.src = resolved.src;
  if (!mediaPaths.includes(resolved.path)) mediaPaths.push(resolved.path);
  // Intrinsic size reserves space (no layout shift). An explicit width alone keeps the ratio.
  const width = positive(image.properties.width);
  const height = positive(image.properties.height);
  if (resolved.width && resolved.height) {
    if (!width && !height) {
      image.properties.width = resolved.width;
      image.properties.height = resolved.height;
    } else if (width && !height) {
      image.properties.height = Math.round((width * resolved.height) / resolved.width);
    } else if (!width && height) {
      image.properties.width = Math.round((height * resolved.width) / resolved.height);
    }
  }
  return image;
}

/** `<picture>` becomes one `<img>` per theme; the site's theme class shows the right one. */
function rewritePicture(
  node: Element,
  ctx: RepoContext,
  assets: ReadmeAssets,
  mediaPaths: string[],
): ElementContent[] {
  const fallback = node.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "img",
  );
  const sources = node.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "source",
  );
  const dark = sources.find((s) => themeOfImage("", str(s.properties.media)) === "dark");
  const light = sources.find((s) => themeOfImage("", str(s.properties.media)) === "light");
  const template = fallback ?? el("img");
  const out: ElementContent[] = [];

  const lightSrc = light
    ? firstSrcsetUrl(str(light.properties.srcSet))
    : str(fallback?.properties.src);
  const darkSrc = dark ? firstSrcsetUrl(str(dark.properties.srcSet)) : null;
  const lightImg = rewriteImage(
    template,
    lightSrc,
    darkSrc ? "light" : null,
    ctx,
    assets,
    mediaPaths,
  );
  if (lightImg) out.push(lightImg);
  if (darkSrc) {
    const darkImg = rewriteImage(template, darkSrc, "dark", ctx, assets, mediaPaths);
    if (darkImg) out.push(darkImg);
  }
  return out;
}

function rewriteLink(node: Element, ctx: RepoContext, assets: ReadmeAssets): Element | null {
  const target = classifyLink(str(node.properties.href), ctx);
  switch (target.kind) {
    case "invalid":
      return null;
    case "anchor":
      node.properties.href = target.href;
      return node;
    case "document": {
      const internal = assets.documents.get(target.repoPath);
      if (internal) {
        node.properties.href = internal;
        node.properties.dataDocument = "";
        return node;
      }
      node.properties.href = target.githubUrl;
      break;
    }
    case "external":
      node.properties.href = target.href;
      break;
  }
  node.properties.target = "_blank";
  node.properties.rel = ["noopener", "noreferrer"];
  return node;
}

/** Applies image and link rules in one pass, replacing nodes in their parents. */
function rewriteMedia(tree: Root, ctx: RepoContext, assets: ReadmeAssets): string[] {
  const mediaPaths: string[] = [];
  visit(tree, "element", (node, index, parent) => {
    if (!parent || index === undefined) return;
    let replacement: ElementContent[] | null = null;
    if (node.tagName === "picture") replacement = rewritePicture(node, ctx, assets, mediaPaths);
    else if (node.tagName === "img") {
      const src = str(node.properties.src);
      const image = rewriteImage(node, src, themeOfImage(src ?? ""), ctx, assets, mediaPaths);
      replacement = image ? [image] : [];
    } else if (node.tagName === "source") replacement = [];
    else if (node.tagName === "a") {
      const link = rewriteLink(node, ctx, assets);
      if (link) return;
      replacement = node.children; // unsafe or empty href: keep the text, drop the link
    } else return;

    (parent.children as RootContent[]).splice(index, 1, ...replacement);
    return [SKIP, index + replacement.length];
  });
  return mediaPaths;
}

/** `> [!NOTE]` blockquotes become GitHub-style alert boxes. */
function transformAlerts(tree: Root): void {
  visit(tree, "element", (node) => {
    if (node.tagName !== "blockquote") return;
    const first = node.children.find((c): c is Element => c.type === "element");
    if (!first || first.tagName !== "p") return;
    const lead = first.children[0];
    if (lead?.type !== "text") return;
    const match = /^\s*\[!(note|tip|important|warning|caution)\]\s*(?:\n|$)/i.exec(lead.value);
    if (!match) return;
    const type = match[1]!.toLowerCase() as AlertType;

    lead.value = lead.value.slice(match[0].length);
    if (first.children[0]?.type === "element" && (first.children[0] as Element).tagName === "br") {
      first.children.shift();
    }
    if (!lead.value) first.children.splice(first.children.indexOf(lead), 1);
    if (first.children.length === 0) node.children.splice(node.children.indexOf(first), 1);

    const icon = el(
      "svg",
      { viewBox: "0 0 16 16", width: 16, height: 16, ariaHidden: "true", className: ["octicon"] },
      [el("path", { d: ALERTS[type].icon })],
    );
    const title = el("p", { className: ["markdown-alert-title"] }, [
      icon,
      text(ALERTS[type].title),
    ]);
    node.tagName = "div";
    node.properties = { className: ["markdown-alert", `markdown-alert-${type}`] };
    node.children = [title, ...node.children];
  });
}

/** Mermaid code blocks become placeholders the client renders (lazy, strict security). */
function transformMermaid(tree: Root): boolean {
  let found = false;
  visit(tree, "element", (node) => {
    if (node.tagName !== "pre") return;
    const code = node.children.find((c): c is Element => c.type === "element");
    if (!code || code.tagName !== "code" || !classes(code).includes("language-mermaid")) return;
    found = true;
    const source = toString(code);
    node.tagName = "div";
    node.properties = { className: ["mermaid-block"], dataMermaid: "" };
    node.children = [el("pre", { className: ["mermaid-source"] }, [text(source)])];
    return SKIP;
  });
  return found;
}

/**
 * The sanitizer prefixes author ids with "user-content-" (no clobbering of page ids); links
 * to "#x" are pointed at "#user-content-x" when only the prefixed id exists.
 */
function fixAnchors(tree: Root): void {
  const ids = new Set<string>();
  visit(tree, "element", (node) => {
    const id = str(node.properties.id);
    if (id) ids.add(id);
  });
  visit(tree, "element", (node) => {
    if (node.tagName !== "a") return;
    const href = str(node.properties.href);
    if (!href?.startsWith("#")) return;
    const target = decodeURIComponent(href.slice(1));
    if (!ids.has(target) && ids.has(`user-content-${target}`)) {
      node.properties.href = `#user-content-${target}`;
    }
  });
}

/** Tables scroll horizontally inside their own wrapper. */
function wrapTables(tree: Root): void {
  visit(tree, "element", (node, index, parent) => {
    if (node.tagName !== "table" || !parent || index === undefined) return;
    (parent.children as RootContent[])[index] = el("div", { className: ["table-wrapper"] }, [node]);
    return SKIP;
  });
}

export async function renderReadme(
  markdown: string,
  ctx: RepoContext,
  resolve: (refs: ReadmeRefs) => Promise<ReadmeAssets>,
): Promise<RenderedReadme> {
  const tree = await parse(markdown);
  const assets = await resolve(collectRefs(tree, ctx));
  const mediaPaths = rewriteMedia(tree, ctx, assets);
  transformAlerts(tree);
  const hasMermaid = transformMermaid(tree);
  wrapTables(tree);

  const finish = unified()
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaHidden: "true", tabIndex: -1 },
      content: text("#"),
    })
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      lazy: true,
      fallbackLanguage: "text",
      addLanguageClass: true,
    })
    .use(rehypeStringify);
  const finished = (await finish.run(tree)) as Root;
  fixAnchors(finished);
  return { html: finish.stringify(finished), mediaPaths, hasMermaid };
}

/** `refs` without any resolution: every image becomes a link (tests, dry runs). */
export async function noAssets(): Promise<ReadmeAssets> {
  return { images: new Map(), documents: new Map() };
}
