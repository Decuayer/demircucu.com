import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import tr from "@/messages/tr.json";
import { ThemeToggle } from "./theme-toggle";

const { setTheme, state } = vi.hoisted(() => ({
  setTheme: vi.fn(),
  state: { theme: "system", resolvedTheme: "dark" },
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ ...state, setTheme }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderToggle = () =>
  render(
    <NextIntlClientProvider locale="tr" messages={tr}>
      <ThemeToggle />
    </NextIntlClientProvider>,
  );

describe("ThemeToggle", () => {
  it("is a named menu button", () => {
    renderToggle();
    expect(screen.getByRole("button", { name: "Tema" })).toBeInTheDocument();
  });

  it("offers light, dark and system and marks the current choice", async () => {
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: "Tema" }));
    const system = await screen.findByRole("menuitemradio", { name: "Sistem" });
    expect(system).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Açık" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Koyu" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
