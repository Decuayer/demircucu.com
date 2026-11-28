import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import en from "@/messages/en.json";
import { PostNav } from "./post-nav";
import { ReadingProgress } from "./reading-progress";
import { ShareLinks } from "./share-links";
import { TocDetails, TocSidebar } from "./toc";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const withLocale = (locale: "tr" | "en", node: ReactNode) =>
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en}>
      {node}
    </NextIntlClientProvider>,
  );

const HEADINGS = [
  { id: "giris", text: "Giriş", level: 2 as const },
  { id: "alt", text: "Alt başlık", level: 3 as const },
  { id: "son", text: "Son", level: 2 as const },
];

/** Puts each heading `top` px from the top of the viewport. */
function placeHeadings(tops: number[]) {
  document.body.innerHTML = "";
  HEADINGS.forEach((heading, i) => {
    const element = document.createElement("h2");
    element.id = heading.id;
    element.tabIndex = -1;
    element.getBoundingClientRect = () => ({ top: tops[i]! }) as DOMRect;
    element.scrollIntoView = vi.fn();
    document.body.append(element);
  });
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    // Runs at once; 0 means "no frame pending", as after a real frame has run.
    callback(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("TocSidebar", () => {
  it("lists the headings, indents h3 and marks the section being read", () => {
    placeHeadings([-400, 100, 700]);
    withLocale("tr", <TocSidebar headings={HEADINGS} />);
    const nav = screen.getByRole("navigation", { name: "İçindekiler" });
    expect(nav).toHaveClass("sticky");
    expect(screen.getByRole("link", { name: "Alt başlık" }).parentElement).toHaveClass("pl-4");
    expect(screen.getByRole("link", { name: "Alt başlık" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(screen.getByRole("link", { name: "Son" })).not.toHaveAttribute("aria-current");
  });

  it("jumps to a heading, updates the hash and moves focus", () => {
    placeHeadings([300, 600, 900]);
    const replace = vi.spyOn(history, "replaceState");
    withLocale("en", <TocSidebar headings={HEADINGS} />);
    expect(screen.getByRole("navigation", { name: "Contents" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Son" }));
    const target = document.getElementById("son")!;
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(replace).toHaveBeenCalledWith(null, "", "#son");
    expect(document.activeElement).toBe(target);

    // Reduced motion jumps instantly; modified clicks are left to the browser.
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    fireEvent.click(screen.getByRole("link", { name: "Giriş" }));
    expect(document.getElementById("giris")!.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
    fireEvent.click(screen.getByRole("link", { name: "Alt başlık" }), { metaKey: true });
    expect(document.getElementById("alt")!.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("TocDetails", () => {
  it("is a collapsed details block with the same links", () => {
    withLocale("tr", <TocDetails headings={HEADINGS} className="mb-8" />);
    const details = screen.getByTestId("toc-details");
    expect(details.tagName).toBe("DETAILS");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveClass("mb-8");
    expect(screen.getByText("İçindekiler", { selector: "summary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Son", hidden: true })).toHaveAttribute("href", "#son");
  });
});

describe("ReadingProgress", () => {
  it("follows the article from its top to its end", () => {
    const article = document.createElement("div");
    article.id = "post";
    let top = 64;
    article.getBoundingClientRect = () => ({ top, height: 1636 }) as DOMRect;
    document.body.append(article);
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });

    const { container } = render(<ReadingProgress targetId="post" />);
    const track = container.querySelector("[data-testid=reading-progress]") as HTMLElement;
    expect(track).toHaveAttribute("aria-hidden", "true");
    expect(track.dataset.progress).toBe("0.00");

    top = 64 - 400; // 400 of 800 scrollable pixels
    act(() => void window.dispatchEvent(new Event("scroll")));
    expect(track.dataset.progress).toBe("0.50");
    expect((track.firstElementChild as HTMLElement).style.transform).toBe("scaleX(0.5)");

    top = -5000;
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(track.dataset.progress).toBe("1.00");
  });

  it("treats a short article as read once it starts scrolling", () => {
    const article = document.createElement("div");
    article.id = "short";
    article.getBoundingClientRect = () => ({ top: 10, height: 200 }) as DOMRect;
    document.body.append(article);
    const { container } = render(<ReadingProgress targetId="short" />);
    expect(
      (container.querySelector("[data-testid=reading-progress]") as HTMLElement).dataset.progress,
    ).toBe("1.00");
  });

  it("does nothing without its article", () => {
    const { container } = render(<ReadingProgress targetId="missing" />);
    expect(
      (container.querySelector("[data-testid=reading-progress]") as HTMLElement).dataset.progress,
    ).toBe("0.00");
  });
});

describe("ShareLinks", () => {
  it("links to X and LinkedIn and copies the URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    withLocale("tr", <ShareLinks url="https://e.com/tr/blog/a?utm_source=share" title="Başlık" />);
    expect(screen.getByRole("group", { name: "Bu yazıyı paylaş" })).toBeInTheDocument();
    const x = new URL(
      screen.getByRole("link", { name: "X üzerinde paylaş" }).getAttribute("href")!,
    );
    expect(x.searchParams.get("text")).toBe("Başlık");
    expect(screen.getByRole("link", { name: "LinkedIn üzerinde paylaş" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.queryByRole("button", { name: "Paylaş…" })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Linki kopyala" }));
    });
    expect(writeText).toHaveBeenCalledWith("https://e.com/tr/blog/a?utm_source=share");
    expect(screen.getByRole("status")).toHaveTextContent("Link kopyalandı");
  });

  it("reports a failed copy and offers the native sheet on touch devices", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    withLocale("en", <ShareLinks url="https://e.com/en/blog/a" title="Title" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Could not copy the link");
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    expect(share).toHaveBeenCalledWith({ title: "Title", url: "https://e.com/en/blog/a" });
    Reflect.deleteProperty(navigator, "share");
  });
});

describe("PostNav", () => {
  const older = {
    slug: "eski",
    titleTr: "Eski yazı",
    titleEn: "Old post",
    createdAt: new Date("2025-01-01T12:00:00Z"),
  };
  const newer = { ...older, slug: "yeni", titleTr: "Yeni yazı", titleEn: "New post" };

  it("links the older post as previous and the newer as next", () => {
    withLocale("tr", <PostNav previous={older} next={newer} />);
    expect(screen.getByRole("navigation", { name: "Diğer yazılar" })).toBeInTheDocument();
    expect(screen.getByTestId("post-nav-previous")).toHaveAttribute("href", "/blog/eski");
    expect(screen.getByTestId("post-nav-previous")).toHaveAttribute("rel", "prev");
    expect(screen.getByTestId("post-nav-previous")).toHaveTextContent("Önceki yazı");
    expect(screen.getByTestId("post-nav-next")).toHaveTextContent("Yeni yazı");
    expect(screen.getByTestId("post-nav-next")).toHaveClass("sm:col-start-2");
  });

  it("uses the page language and renders nothing without neighbours", () => {
    withLocale("en", <PostNav previous={null} next={newer} />);
    expect(screen.getByTestId("post-nav-next")).toHaveTextContent("Next post");
    expect(screen.getByTestId("post-nav-next")).toHaveTextContent("New post");
    expect(screen.queryByTestId("post-nav-previous")).toBeNull();
    cleanup();
    const { container } = withLocale("tr", <PostNav previous={null} next={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
