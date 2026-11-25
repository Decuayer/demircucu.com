import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import HeaderClient from "./header-client";

const replace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/projects",
  useRouter: () => ({ replace }),
}));

afterEach(cleanup);

function renderHeader() {
  return render(
    <NextIntlClientProvider locale="tr" messages={tr}>
      <HeaderClient desktopAuth={<span>desktop-auth</span>} mobileAuth={<span>mobile-auth</span>} />
    </NextIntlClientProvider>,
  );
}

describe("HeaderClient", () => {
  it("starts with a skip link to the main content", () => {
    renderHeader();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("İçeriğe geç");
    expect(links[0]).toHaveAttribute("href", "#main-content");
  });

  it("labels the navigation and marks the current page", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "Ana gezinme" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projelerim" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("names the icon-only controls and switches the language", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Menüyü aç" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tr.nav.switchLanguage }));
    expect(replace).toHaveBeenCalledWith("/projects", { locale: "en" });
  });
});
