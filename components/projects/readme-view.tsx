"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * Renders a README produced by the sync pipeline (sanitised there) and enhances it in place:
 * copy buttons on code blocks, client-side routing for document links, and Mermaid diagrams.
 *
 * Mermaid is imported only when the README has a diagram and one scrolls into view; it runs
 * with `securityLevel: "strict"` and follows the site theme. The diagram source stays in the
 * page (shown until rendering finishes, and if it fails).
 */
export function ReadmeView({ html, locale }: { html: string; locale: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const t = useTranslations("projects.readme");
  const labels = { copy: t("copy"), copied: t("copied") };

  // Copy buttons and document links.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const buttons: HTMLButtonElement[] = [];
    for (const pre of root.querySelectorAll<HTMLPreElement>(
      "pre.shiki, pre:not(.mermaid-source)",
    )) {
      if (pre.parentElement?.classList.contains("code-block")) continue;
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.replaceWith(wrapper);
      wrapper.append(pre);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy";
      button.textContent = labels.copy;
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText);
          button.textContent = labels.copied;
          setTimeout(() => (button.textContent = labels.copy), 1500);
        } catch {
          /* clipboard unavailable (permissions, insecure context) */
        }
      });
      wrapper.append(button);
      buttons.push(button);
    }
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-document]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const href = link.getAttribute("href") ?? "";
      router.push(href.replace(new RegExp(`^/${locale}(?=/)`), ""));
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
    // The HTML is fixed for the lifetime of the component; labels only change with the locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, locale]);

  // Mermaid diagrams, rendered when visible and again when the theme changes.
  useEffect(() => {
    const root = ref.current;
    const blocks = root ? [...root.querySelectorAll<HTMLElement>("[data-mermaid]")] : [];
    if (blocks.length === 0) return;
    let cancelled = false;
    const theme = resolvedTheme === "dark" ? "dark" : "default";

    const render = async (block: HTMLElement, index: number) => {
      const source = block.querySelector(".mermaid-source")?.textContent ?? "";
      const { default: mermaid } = await import("mermaid");
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme,
        fontFamily: "inherit",
      });
      try {
        const { svg } = await mermaid.render(`mermaid-${index}-${Date.now()}`, source);
        if (cancelled) return;
        let target = block.querySelector<HTMLElement>(".mermaid-diagram");
        if (!target) {
          target = document.createElement("div");
          target.className = "mermaid-diagram";
          block.append(target);
        }
        target.innerHTML = svg; // sanitised by Mermaid (strict mode, DOMPurify)
        block.dataset.rendered = "true";
      } catch {
        block.dataset.rendered = "error";
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          void render(entry.target as HTMLElement, blocks.indexOf(entry.target as HTMLElement));
        }
      },
      { rootMargin: "200px" },
    );
    blocks.forEach((block) => observer.observe(block));
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [html, resolvedTheme]);

  return (
    <div
      ref={ref}
      className="markdown-body"
      // Sanitised and rewritten by the sync pipeline (lib/github/readme/render.ts).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
