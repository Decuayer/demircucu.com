import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import en from "@/messages/en.json";
import NotFound from "./not-found";
import PageError from "./error";
import Loading from "./loading";
import GlobalError from "../global-error";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const withLocale = (locale: "tr" | "en", node: ReactNode) =>
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en}>
      {node}
    </NextIntlClientProvider>,
  );

describe("not-found", () => {
  it("is localized and links back into the site", () => {
    withLocale("tr", <NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sayfa bulunamadı");
    expect(screen.getByRole("link", { name: "Ana sayfa" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Projeler" })).toHaveAttribute("href", "/projects");
    cleanup();
    withLocale("en", <NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
  });
});

describe("error", () => {
  it("logs the error, shows its digest and retries", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    withLocale("en", <PageError error={error} retry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Error code: abc123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(error);
  });

  it("omits the code when there is no digest", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    withLocale("tr", <PageError error={new Error("x")} retry={() => {}} />);
    expect(screen.queryByText(/Hata kodu/)).toBeNull();
    expect(screen.getByRole("link", { name: "Ana sayfa" })).toBeInTheDocument();
  });
});

describe("loading", () => {
  it("announces loading to assistive technology", () => {
    withLocale("tr", <Loading />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(tr.common.loading)).toBeInTheDocument();
  });
});

describe("global-error", () => {
  it("renders its own bilingual document", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={Object.assign(new Error("x"), { digest: "d1" })} retry={() => {}} />,
    );
    expect(html).toMatch(/^<html lang="tr"/);
    expect(html).toContain("Bir şeyler ters gitti");
    expect(html).toContain("Something went wrong");
    expect(html).toContain("d1");
  });
});
