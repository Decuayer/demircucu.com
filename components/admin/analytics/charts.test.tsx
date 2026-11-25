import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Eye } from "lucide-react";
import messages from "@/messages/en.json";
import { BarList } from "./bar-list";
import { KpiCard } from "./kpi-card";
import { ViewsChart } from "./views-chart";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

const wrap = (node: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );

describe("ViewsChart", () => {
  it("shows the empty state without views", () => {
    wrap(<ViewsChart series={[{ date: "2026-11-25", views: 0, visitors: 0 }]} />);
    expect(screen.getByTestId("views-chart")).toHaveAttribute("data-empty", "true");
    expect(screen.getByText("No data in this range.")).toBeInTheDocument();
  });

  it("renders the chart with data", () => {
    wrap(
      <ViewsChart
        series={[
          { date: "2026-11-24", views: 6, visitors: 3 },
          { date: "2026-11-25", views: 1, visitors: 1 },
        ]}
        previous={[
          { date: "2026-11-22", views: 2, visitors: 2 },
          { date: "2026-11-23", views: 0, visitors: 0 },
        ]}
      />,
    );
    expect(screen.getByTestId("views-chart")).not.toHaveAttribute("data-empty");
    expect(screen.queryByText("No data in this range.")).toBeNull();
    expect(document.querySelector("[data-slot=chart]")).not.toBeNull();
  });
});

describe("BarList", () => {
  it("shows the empty state", () => {
    wrap(<BarList items={[]} />);
    expect(screen.getByText("No data in this range.")).toBeInTheDocument();
  });

  it("lists items with proportional bars and links", () => {
    wrap(
      <BarList
        items={[
          { key: "a", label: "google.com", views: 10, visitors: 4, href: "/admin/x" },
          { key: "b", label: "Direct / internal", views: 5 },
        ]}
      />,
    );
    expect(screen.getByText("google.com").closest("a")).toHaveAttribute("href", "/admin/x");
    expect(screen.getByText("4 vis.")).toBeInTheDocument();
    const bars = document.querySelectorAll<HTMLElement>("[aria-hidden]");
    expect(bars[0]!.style.width).toBe("100%");
    expect(bars[1]!.style.width).toBe("50%");
  });
});

describe("KpiCard", () => {
  it("shows the change, or 'new' without a previous value", () => {
    wrap(
      <>
        <KpiCard icon={Eye} label="Views" value="120" change={20} />
        <KpiCard icon={Eye} label="Visitors" value="3" change={null} />
      </>,
    );
    expect(screen.getByText("+20%")).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
  });
});
