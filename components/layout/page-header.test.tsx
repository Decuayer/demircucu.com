import { renderToStaticMarkup } from "react-dom/server";
import { Code2 } from "lucide-react";
import { describe, expect, it } from "vitest";
import { PageHeader, PageShell, SectionHeading } from "./page-header";
import { Prose } from "../prose";

describe("page layout", () => {
  it("PageShell sets the page padding and width", () => {
    const html = renderToStaticMarkup(<PageShell width="article">x</PageShell>);
    expect(html).toContain('class="py-16 md:py-24"');
    expect(html).toContain("max-w-xl");
    expect(renderToStaticMarkup(<PageShell>x</PageShell>)).toContain("max-w-5xl");
  });

  it("PageHeader puts the title on the h1 step with an optional eyebrow and lead", () => {
    const html = renderToStaticMarkup(
      <PageHeader eyebrow="Blog" icon={Code2} title="Yazılar" lead="Notlar" />,
    );
    expect(html).toMatch(/<h1 class="text-h1[^"]*">Yazılar<\/h1>/);
    expect(html).toContain("text-center");
    expect(html).toContain("mb-12 md:mb-16");
    expect(html).toMatch(/<p class="[^"]*text-lead[^"]*mx-auto[^"]*">Notlar<\/p>/);
    expect(html).toContain("<svg");

    const bare = renderToStaticMarkup(<PageHeader title="T" align="start" />);
    expect(bare).not.toContain("text-center");
    expect(bare).not.toContain("<p");
    expect(bare).not.toContain("<span");
  });

  it("SectionHeading is an h2 on the h2 step, 24px above its content", () => {
    expect(renderToStaticMarkup(<SectionHeading id="s">Başlık</SectionHeading>)).toBe(
      '<h2 id="s" class="mb-6 flex items-center gap-3 text-h2">Başlık</h2>',
    );
    expect(renderToStaticMarkup(<SectionHeading icon={Code2}>B</SectionHeading>)).toContain(
      'aria-hidden="true"',
    );
  });

  it("Prose renders stored HTML with the site reading styles", () => {
    const html = renderToStaticMarkup(<Prose html="<p>Merhaba</p>" size="article" />);
    expect(html).toContain('data-size="article"');
    expect(html).toMatch(/class="(prose prose-site|prose-site prose)"/);
    expect(html).toContain("<p>Merhaba</p>");
    expect(renderToStaticMarkup(<Prose html="" />)).toContain('data-size="default"');
  });
});
