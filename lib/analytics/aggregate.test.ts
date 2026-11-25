import { describe, expect, it } from "vitest";
import { aggregate, SITE_ENTITY, siteMarker, type StatRow } from "./aggregate";
import { FIXTURE_CLICKS, FIXTURE_VIEWS } from "@/tests/fixtures/analytics";
import {
  breakdown,
  engagement,
  entityTotals,
  series,
  sessions,
  totals,
  viewsByType,
} from "./report";

const rows = aggregate(FIXTURE_VIEWS, FIXTURE_CLICKS);
const day1 = rows.filter((row) => row.date === "2026-11-24");
const PR1 = { entityType: "PROJECT", entityKey: "pr1" } as const;
const P1 = { entityType: "BLOG", entityKey: "p1" } as const;
const HOME = { entityType: "HOME", entityKey: "/" } as const;

function find(list: StatRow[], match: Partial<StatRow>): StatRow | undefined {
  return list.find((row) =>
    Object.entries(match).every(([key, value]) => row[key as keyof StatRow] === value),
  );
}

describe("aggregate", () => {
  it("counts site totals per UTC day", () => {
    expect(find(rows, { date: "2026-11-24", ...SITE_ENTITY, dimension: "total" })).toMatchObject({
      views: 6,
      visitors: 3,
    });
    expect(find(rows, { date: "2026-11-25", ...SITE_ENTITY, dimension: "total" })).toMatchObject({
      views: 1,
      visitors: 1,
    });
  });

  it("counts entities by id, the home page by path", () => {
    expect(find(day1, { ...PR1, dimension: "total" })).toMatchObject({ views: 2, visitors: 2 });
    expect(find(day1, { ...HOME, dimension: "total" })).toMatchObject({ views: 2, visitors: 1 });
    expect(
      find(day1, { entityType: "SKILL", entityKey: "t-react", dimension: "total" }),
    ).toMatchObject({ views: 1, visitors: 1 });
  });

  it("breaks views down by dimension", () => {
    expect(find(day1, { ...SITE_ENTITY, dimension: "country", value: "DE" })).toMatchObject({
      views: 2,
      visitors: 1,
    });
    expect(find(day1, { ...SITE_ENTITY, dimension: "referrer", value: "google.com" })?.views).toBe(
      1,
    );
    expect(find(day1, { ...SITE_ENTITY, dimension: "referrer", value: "" })?.views).toBe(5);
    expect(find(day1, { ...SITE_ENTITY, dimension: "utm", value: "linkedin" })?.views).toBe(1);
    expect(find(rows, { date: "2026-11-25", ...P1, dimension: "locale", value: "en" })?.views).toBe(
      1,
    );
    expect(
      find(rows, { date: "2026-11-25", ...P1, dimension: "device", value: "MOBILE" })?.views,
    ).toBe(1);
  });

  it("records the previous page of the session", () => {
    expect(find(day1, { ...PR1, dimension: "from", value: "/blog/p1-slug" })?.views).toBe(1);
    expect(find(day1, { ...PR1, dimension: "from", value: "/skills/react" })?.views).toBe(1);
    expect(find(day1, { ...P1, dimension: "from", value: "" })?.views).toBe(1);
  });

  it("sums engagement only over measured views", () => {
    expect(find(day1, { ...PR1, dimension: "engagement", value: "duration" })).toMatchObject({
      views: 2,
      visitors: 80,
    });
    expect(find(day1, { ...PR1, dimension: "engagement", value: "scroll" })).toMatchObject({
      views: 2,
      visitors: 150,
    });
  });

  it("counts sessions and their engaged time for the site", () => {
    // s-a 150 s, s-b1 0 s, s-b2 10 s, s-c 50 s.
    expect(find(day1, { ...SITE_ENTITY, dimension: "session" })).toMatchObject({
      views: 4,
      visitors: 210,
    });
  });

  it("counts outbound clicks per target, with unique clickers", () => {
    expect(find(day1, { ...PR1, dimension: "outbound", value: "LIVE" })).toMatchObject({
      views: 2,
      visitors: 1,
    });
    expect(find(day1, { ...SITE_ENTITY, dimension: "outbound", value: "GITHUB" })?.views).toBe(1);
  });

  it("never files a click without a page path under the site key twice", () => {
    const result = aggregate(
      [],
      [{ ...FIXTURE_CLICKS[0]!, entityType: "PAGE", entityId: null, path: null }],
    );
    expect(result.filter((row) => row.dimension === "outbound")).toHaveLength(1);
  });

  it("is empty for no input; the marker records an empty day", () => {
    expect(aggregate([], [])).toEqual([]);
    expect(siteMarker("2026-11-26")).toMatchObject({ ...SITE_ENTITY, views: 0, visitors: 0 });
  });
});

describe("report", () => {
  it("totals and daily series", () => {
    expect(totals(rows)).toEqual({ views: 7, visitors: 4 });
    expect(totals(rows, P1)).toEqual({ views: 2, visitors: 2 });
    expect(series(rows, ["2026-11-23", "2026-11-24", "2026-11-25"])).toEqual([
      { date: "2026-11-23", views: 0, visitors: 0 },
      { date: "2026-11-24", views: 6, visitors: 3 },
      { date: "2026-11-25", views: 1, visitors: 1 },
    ]);
  });

  it("breakdowns are sorted by views and limited", () => {
    expect(breakdown(rows, "browser")).toEqual([
      { value: "Chrome", views: 4, visitors: 2 },
      { value: "Firefox", views: 2, visitors: 1 },
      { value: "Mobile Safari", views: 1, visitors: 1 },
    ]);
    expect(breakdown(rows, "browser", SITE_ENTITY, 1)).toHaveLength(1);
  });

  it("entity totals exclude the site row", () => {
    expect(entityTotals(rows)).toEqual([
      { entityType: "HOME", entityKey: "/", views: 2, visitors: 1 },
      { entityType: "BLOG", entityKey: "p1", views: 2, visitors: 2 },
      { entityType: "PROJECT", entityKey: "pr1", views: 2, visitors: 2 },
      { entityType: "SKILL", entityKey: "t-react", views: 1, visitors: 1 },
    ]);
    expect(entityTotals(rows, "PROJECT")).toHaveLength(1);
    expect(viewsByType(rows).reduce((total, item) => total + item.views, 0)).toBe(7);
  });

  it("averages engagement and sessions", () => {
    expect(engagement(rows, PR1)).toEqual({ avgSeconds: 40, avgScroll: 75 });
    expect(engagement(rows, HOME)).toEqual({ avgSeconds: 10, avgScroll: null });
    // Day 2 adds one session without engagement: 210 s over 5 sessions.
    expect(sessions(rows)).toEqual({ count: 5, avgSeconds: 42 });
    expect(sessions([])).toEqual({ count: 0, avgSeconds: null });
  });
});
