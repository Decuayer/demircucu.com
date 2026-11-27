import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import AdminLayout, { activeAdminItem } from "./client-layout";

const nav = vi.hoisted(() => ({ pathname: "/admin/projects/abc/edit" }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
  usePathname: () => nav.pathname,
}));

afterEach(cleanup);

const renderLayout = () =>
  render(
    <NextIntlClientProvider locale="tr" messages={tr}>
      <AdminLayout>
        <p>content</p>
      </AdminLayout>
    </NextIntlClientProvider>,
  );

describe("activeAdminItem", () => {
  it("matches the dashboard exactly and sections by prefix", () => {
    expect(activeAdminItem("/admin")?.key).toBe("dashboard");
    expect(activeAdminItem("/admin/analytics/blog/x")?.key).toBe("analytics");
    expect(activeAdminItem("/admin/contacts")?.key).toBe("messages");
    expect(activeAdminItem("/admin/unknown")).toBeUndefined();
  });
});

describe("AdminLayout", () => {
  it("names the current section and marks it in the menu", () => {
    renderLayout();
    expect(screen.getByTestId("admin-current-section")).toHaveTextContent("Projeler");
    const sidebar = screen.getByRole("navigation", { name: "Admin menüsü" });
    expect(sidebar.querySelector('[aria-current="page"]')).toHaveTextContent("Projeler");
    expect(screen.getByRole("link", { name: "Medya" })).toHaveAttribute("href", "/admin/media");
  });

  it("opens the menu in a sheet and closes it after navigating", async () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Admin menüsü" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Admin Panel");
    fireEvent.click(screen.getAllByRole("link", { name: "Mesajlar" }).at(-1)!);
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
