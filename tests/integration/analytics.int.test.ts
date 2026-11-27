/**
 * Analytics against Postgres: recording (entity resolution, dedupe, sessions, beacons), the
 * tracking endpoint (privacy signals, bots, admins, rate limit, invalid payloads), the nightly
 * aggregation (known fixture → expected DailyStat rows, idempotency, view counts, retention)
 * and the dashboard reads that merge DailyStat with raw rows.
 */
import { afterTasks, auth, headerValues } from "../helpers/action-mocks";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID, SEED_USER_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";
import { FIXTURE_CLICKS, FIXTURE_VIEWS } from "../fixtures/analytics";

const { recordView, recordEngagement, recordOutbound, DEDUPE_WINDOW_MS } =
  await import("@/lib/analytics/record");
const { runDailyAggregation, RAW_RETENTION_DAYS } = await import("@/lib/analytics/job");
const { loadRows } = await import("@/lib/analytics/rows");
const { totals, breakdown } = await import("@/lib/analytics/report");
const { resetSaltMemo } = await import("@/lib/analytics/salt");
const { getEntityAnalytics, getDashboard } = await import("@/lib/analytics/queries");
const { parseRange } = await import("@/lib/analytics/range");
const { POST } = await import("@/app/api/e/route");
const { POST: LEGACY_POST } = await import("@/app/api/track/route");
const { GET: cron } = await import("@/app/api/cron/analytics/route");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function context(now = new Date(), overrides: { ip?: string; userAgent?: string } = {}) {
  return {
    headers: new Headers({ "x-vercel-ip-country": "TR" }),
    ip: overrides.ip ?? "198.51.100.1",
    userAgent: overrides.userAgent ?? UA,
    host: "www.demircucu.com",
    now,
  };
}

const view = (path: string, extra: Record<string, string> = {}) => ({
  type: "view" as const,
  id: randomUUID(),
  path,
  ...extra,
});

beforeEach(async () => {
  await resetDatabase();
  await seed(prisma);
  resetSaltMemo();
  auth.current = null;
  afterTasks.length = 0;
});

describe("recordView", () => {
  it("records published content with its entity and request details", async () => {
    const payload = view("/en/projects/sample-project", {
      referrer: "https://www.google.com/search",
      utmSource: "LinkedIn",
    });
    expect(await recordView(payload, context())).toBe("recorded");
    const row = await prisma.pageView.findUniqueOrThrow({ where: { id: payload.id } });
    const project = await prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
    expect(row).toMatchObject({
      path: "/projects/sample-project",
      locale: "en",
      entityType: "PROJECT",
      entityId: project.id,
      referrerHost: "google.com",
      utmSource: "linkedin",
      country: "TR",
      deviceType: "DESKTOP",
      browser: "Chrome",
    });
    expect(row.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.visitorHash).not.toContain("198.51.100.1");
  });

  it("ignores drafts, unknown slugs and untracked paths", async () => {
    expect(await recordView(view("/tr/projects/draft-project"), context())).toBe("unknown");
    expect(await recordView(view("/tr/blog/draft-post"), context())).toBe("unknown");
    expect(await recordView(view("/tr/blog/nope"), context())).toBe("unknown");
    expect(await recordView(view("/tr/admin"), context())).toBe("untracked");
    expect(await recordView(view("/tr/wp-login.php"), context())).toBe("untracked");
    expect(await prisma.pageView.count()).toBe(0);
  });

  it("records the home page, static pages and skills", async () => {
    expect(await recordView(view("/tr"), context())).toBe("recorded");
    expect(await recordView(view("/tr/about"), context())).toBe("recorded");
    expect(await recordView(view("/tr/skills/python"), context())).toBe("recorded");
    const rows = await prisma.pageView.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.entityType).sort()).toEqual(["HOME", "PAGE", "SKILL"]);
  });

  it("counts a repeat view of the same page within 30 minutes once, in any locale", async () => {
    const start = new Date("2026-11-26T10:00:00Z");
    expect(await recordView(view("/tr/blog/hello-world"), context(start))).toBe("recorded");
    const later = new Date(start.getTime() + 10 * 60_000);
    expect(await recordView(view("/en/blog/hello-world"), context(later))).toBe("duplicate");
    // Another visitor is counted.
    expect(
      await recordView(view("/tr/blog/hello-world"), context(later, { ip: "198.51.100.2" })),
    ).toBe("recorded");
    const after = new Date(start.getTime() + DEDUPE_WINDOW_MS + 60_000);
    expect(await recordView(view("/tr/blog/hello-world"), context(after))).toBe("recorded");
    expect(await prisma.pageView.count()).toBe(3);
  });

  it("keeps one session while the visitor is active and starts a new one after a gap", async () => {
    const t0 = new Date("2026-11-26T10:00:00Z");
    const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);
    await recordView(view("/tr"), context(at(0)));
    await recordView(view("/tr/about"), context(at(5)));
    await recordView(view("/tr/blog/hello-world"), context(at(50)));
    const rows = await prisma.pageView.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows[0]!.sessionId).toBe(rows[1]!.sessionId);
    expect(rows[2]!.sessionId).not.toBe(rows[1]!.sessionId);
  });

  it("treats a replayed id as a duplicate", async () => {
    const payload = view("/tr/about");
    await recordView(payload, context());
    const other = context(new Date(Date.now() + DEDUPE_WINDOW_MS * 2), { ip: "198.51.100.9" });
    expect(await recordView(payload, other)).toBe("duplicate");
  });
});

describe("beacons", () => {
  it("engagement only grows and only for recent views", async () => {
    const payload = view("/tr/blog/hello-world");
    await recordView(payload, context());
    const beacon = { type: "engagement" as const, id: payload.id };
    expect(
      await recordEngagement({ ...beacon, durationMs: 5_000, scrollDepth: 60 }, context()),
    ).toBe(true);
    await recordEngagement({ ...beacon, durationMs: 2_000, scrollDepth: 30 }, context());
    expect(await prisma.pageView.findUniqueOrThrow({ where: { id: payload.id } })).toMatchObject({
      durationMs: 5_000,
      scrollDepth: 60,
    });
    const late = new Date(Date.now() + 7 * 3_600_000);
    expect(
      await recordEngagement({ ...beacon, durationMs: 9_000, scrollDepth: 90 }, context(late)),
    ).toBe(false);
  });

  it("outbound clicks are linked to their page view and classified", async () => {
    const payload = view("/tr/projects/sample-project");
    await recordView(payload, context());
    const click = {
      type: "outbound" as const,
      id: payload.id,
      path: "/tr/projects/sample-project",
    };
    expect(await recordOutbound({ ...click, href: "https://github.com/x/y" }, context())).toBe(
      "recorded",
    );
    // A "GITHUB" claim for another host is not trusted.
    await recordOutbound({ ...click, href: "https://evil.test/", target: "GITHUB" }, context());
    await recordOutbound({ ...click, href: "https://demo.example/", target: "LIVE" }, context());
    expect(await recordOutbound({ ...click, href: "javascript:alert(1)" }, context())).toBe(
      "untracked",
    );
    const rows = await prisma.outboundClick.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => [r.target, r.targetHost, r.pageViewId])).toEqual([
      ["GITHUB", "github.com", payload.id],
      ["OTHER", "evil.test", payload.id],
      ["LIVE", "demo.example", payload.id],
    ]);
    expect(rows[0]!.entityType).toBe("PROJECT");
  });
});

describe("POST /api/e", () => {
  function request(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost:3000/api/e", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "user-agent": UA,
        "content-type": "application/json",
        ...headers,
      },
    });
  }

  async function send(body: unknown, headers?: Record<string, string>) {
    const response = await POST(request(body, headers));
    for (const task of afterTasks.splice(0)) await task();
    return response.status;
  }

  it("records a view after the response", async () => {
    expect(await send(view("/tr/about"))).toBe(204);
    expect(await prisma.pageView.count()).toBe(1);
  });

  it("still accepts beacons on the former /api/track path (until 2026-12-27)", async () => {
    expect(LEGACY_POST).toBe(POST);
    const response = await LEGACY_POST(request(view("/tr/blog/hello-world")));
    for (const task of afterTasks.splice(0)) await task();
    expect(response.status).toBe(204);
    expect(await prisma.pageView.count()).toBe(1);
  });

  it.each([
    ["Do Not Track", { dnt: "1" }],
    ["Global Privacy Control", { "sec-gpc": "1" }],
    ["a bot", { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" }],
    ["a missing user agent", { "user-agent": "" }],
    ["a prefetch", { "next-router-prefetch": "1" }],
  ])("ignores %s with 204", async (_name, headers) => {
    expect(await send(view("/tr/about"), headers)).toBe(204);
    expect(await prisma.pageView.count()).toBe(0);
  });

  it("does not count admins but counts other signed-in users", async () => {
    const cookie = { cookie: "sb-test-auth-token=x" };
    auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
    expect(await send(view("/tr/about"), cookie)).toBe(204);
    expect(await prisma.pageView.count()).toBe(0);
    auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_USER_ID } });
    expect(await send(view("/tr/about"), cookie)).toBe(204);
    expect(await prisma.pageView.count()).toBe(1);
  });

  it("rejects cross-site requests and invalid payloads", async () => {
    expect(await send(view("/tr/about"), { origin: "https://evil.test" })).toBe(403);
    expect(await send("{not json")).toBe(400);
    expect(await send({ type: "view", id: "x", path: "/tr" })).toBe(400);
    expect(await send(JSON.stringify({ ...view("/tr"), referrer: "x".repeat(5000) }))).toBe(413);
    expect(await prisma.pageView.count()).toBe(0);
  });

  it("accepts beacons without Origin from the same site only", async () => {
    const noOrigin = { origin: "" };
    expect(await send(view("/tr/about"), { ...noOrigin, "sec-fetch-site": "same-origin" })).toBe(
      204,
    );
    expect(
      await send(view("/tr/blog/hello-world"), { ...noOrigin, "sec-fetch-site": "cross-site" }),
    ).toBe(403);
    expect(await prisma.pageView.count()).toBe(1);
  });

  it("stops writing once the per-IP rate limit is reached", async () => {
    headerValues.ip = "203.0.113.50";
    for (let i = 0; i < 62; i++) {
      await send({ type: "engagement", id: randomUUID(), durationMs: 1, scrollDepth: 1 });
    }
    expect(await send(view("/tr/about"))).toBe(204);
    expect(await prisma.pageView.count()).toBe(0);
    headerValues.ip = "203.0.113.7";
  });
});

async function insertFixture() {
  const post = await prisma.blogPost.findUniqueOrThrow({ where: { slug: "hello-world" } });
  await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: 10 } });
  // The fixture's post p1 is the seeded post.
  const swap = (id: string | null) => (id === "p1" ? post.id : id);
  await prisma.pageView.createMany({
    data: FIXTURE_VIEWS.map((v) => ({ ...v, entityId: swap(v.entityId) })),
  });
  const ids = new Map(FIXTURE_VIEWS.map((v) => [`${v.visitorHash}:${v.path}`, v.id]));
  await prisma.outboundClick.createMany({
    data: FIXTURE_CLICKS.map(({ path, ...c }) => ({
      ...c,
      targetHost: c.target === "GITHUB" ? "github.com" : "demo.example",
      pageViewId: ids.get(`${c.visitorHash}:${path}`) ?? null,
    })),
  });
  return post;
}

describe("runDailyAggregation", () => {
  const NOW = new Date("2026-11-26T00:15:00Z");

  it("aggregates the fixture into the expected daily rows, once", async () => {
    const post = await insertFixture();
    const result = await runDailyAggregation(NOW);
    expect(result.aggregatedDays).toEqual(["2026-11-24", "2026-11-25"]);
    expect(result.updatedPosts).toBe(2);

    const site = await prisma.dailyStat.findMany({
      where: { entityType: "PAGE", entityKey: "", dimension: "total" },
      orderBy: { date: "asc" },
    });
    expect(site.map((r) => [r.views, r.visitors])).toEqual([
      [6, 3],
      [1, 1],
    ]);
    const live = await prisma.dailyStat.findFirstOrThrow({
      where: { entityKey: "pr1", dimension: "outbound", value: "LIVE" },
    });
    expect([live.views, live.visitors]).toEqual([2, 1]);
    // 10 before analytics + 1 view on each day.
    expect((await prisma.blogPost.findUniqueOrThrow({ where: { id: post.id } })).viewCount).toBe(
      12,
    );

    const again = await runDailyAggregation(NOW);
    expect(again.aggregatedDays).toEqual([]);
    expect((await prisma.blogPost.findUniqueOrThrow({ where: { id: post.id } })).viewCount).toBe(
      12,
    );
  });

  it("writes a marker for days without traffic and catches up after missed runs", async () => {
    await runDailyAggregation(new Date("2026-11-20T00:15:00Z"));
    const result = await runDailyAggregation(NOW);
    expect(result.aggregatedDays).toEqual([
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
    ]);
    const markers = await prisma.dailyStat.count({ where: { entityType: "PAGE", entityKey: "" } });
    expect(markers).toBe(7);
  });

  it("does not aggregate today", async () => {
    await prisma.pageView.create({
      data: { ...FIXTURE_VIEWS[0]!, id: "today", createdAt: new Date("2026-11-26T00:05:00Z") },
    });
    await runDailyAggregation(NOW);
    expect(
      await prisma.dailyStat.count({ where: { date: new Date("2026-11-26T00:00:00Z") } }),
    ).toBe(0);
  });

  it("deletes raw rows past retention only after their day is aggregated, and old salts", async () => {
    const old = new Date(NOW.getTime() - (RAW_RETENTION_DAYS + 2) * 86_400_000);
    await prisma.pageView.create({ data: { ...FIXTURE_VIEWS[0]!, id: "old", createdAt: old } });
    await prisma.pageView.create({ data: { ...FIXTURE_VIEWS[1]!, id: "recent" } });
    await prisma.analyticsSalt.createMany({
      data: [
        { date: new Date("2026-11-24T00:00:00Z"), salt: "a" },
        { date: new Date("2026-11-26T00:00:00Z"), salt: "b" },
      ],
    });
    const result = await runDailyAggregation(NOW);
    expect(result.deletedViews).toBe(1);
    expect(await prisma.pageView.findUnique({ where: { id: "old" } })).toBeNull();
    expect(await prisma.pageView.findUnique({ where: { id: "recent" } })).not.toBeNull();
    // The old day was aggregated before its rows went.
    expect(
      await prisma.dailyStat.count({ where: { date: new Date(old.toISOString().slice(0, 10)) } }),
    ).toBeGreaterThan(0);
    expect((await prisma.analyticsSalt.findMany()).map((s) => s.salt)).toEqual(["b"]);
  });

  it("the cron route needs the secret", async () => {
    process.env.CRON_SECRET = "test-secret";
    const call = (auth?: string) =>
      cron(
        new Request("http://localhost/api/cron/analytics", {
          headers: auth ? { authorization: auth } : {},
        }),
      );
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    const ok = await call("Bearer test-secret");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true });
    delete process.env.CRON_SECRET;
  });
});

describe("dashboard reads", () => {
  it("merge DailyStat with raw rows of days not aggregated yet", async () => {
    await insertFixture();
    await runDailyAggregation(new Date("2026-11-25T00:15:00Z")); // only the 24th
    const rows = await loadRows("2026-11-24", "2026-11-25");
    expect(totals(rows)).toEqual({ views: 7, visitors: 4 });
    expect(breakdown(rows, "locale")).toEqual([
      { value: "tr", views: 6, visitors: 3 },
      { value: "en", views: 1, visitors: 1 },
    ]);
  });

  it("entity analytics and the dashboard for an admin", async () => {
    auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
    const post = await insertFixture();
    const range = parseRange(
      { range: "custom", from: "2026-11-20", to: "2026-11-25" },
      new Date("2026-11-25T12:00:00Z"),
    );
    const data = await getEntityAnalytics("BLOG", post.id, range, "en");
    expect(data).toMatchObject({
      publicPath: "/blog/hello-world",
      interactions: expect.any(Object),
    });
    expect(data!.views.value).toBe(2);
    expect(data!.avgEngagedSeconds.value).toBe(120);
    expect(await getEntityAnalytics("BLOG", "missing", range, "en")).toBeNull();

    const dashboard = await getDashboard(range, "en");
    expect(dashboard.traffic.views.value).toBe(7);
    expect(dashboard.traffic.top.BLOG[0]).toMatchObject({ entityKey: post.id, views: 2 });
    expect(dashboard.traffic.top.PAGE.map((item) => item.entityKey)).toContain("/");
    expect(dashboard.content.posts).toBe(1);
  });
});
