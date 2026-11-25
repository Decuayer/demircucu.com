import type { RawClick, RawView } from "@/lib/analytics/aggregate";

/**
 * Known traffic for aggregation tests (unit and integration):
 * 2026-11-24: visitor A reads post p1 then project pr1 (one session), visitor B opens the home
 *   page twice in two sessions, visitor C lands on pr1 from the skill page of react.
 * 2026-11-25: visitor D reads p1 on mobile in English.
 * Clicks: A clicks GitHub on pr1, C clicks the live site on pr1 twice.
 */
const base = {
  locale: "tr",
  referrerHost: null,
  utmSource: null,
  country: "TR",
  deviceType: "DESKTOP",
  browser: "Chrome",
  os: "Mac OS",
  durationMs: null,
  scrollDepth: null,
} as const;

export const FIXTURE_VIEWS: RawView[] = [
  {
    ...base,
    id: "v1",
    createdAt: new Date("2026-11-24T08:00:00Z"),
    path: "/blog/p1-slug",
    entityType: "BLOG",
    entityId: "p1",
    referrerHost: "google.com",
    visitorHash: "A",
    sessionId: "s-a",
    durationMs: 120_000,
    scrollDepth: 90,
  },
  {
    ...base,
    id: "v2",
    createdAt: new Date("2026-11-24T08:03:00Z"),
    path: "/projects/pr1-slug",
    entityType: "PROJECT",
    entityId: "pr1",
    visitorHash: "A",
    sessionId: "s-a",
    durationMs: 30_000,
    scrollDepth: 50,
  },
  {
    ...base,
    id: "v3",
    createdAt: new Date("2026-11-24T09:00:00Z"),
    path: "/",
    entityType: "HOME",
    entityId: null,
    country: "DE",
    browser: "Firefox",
    os: "Windows",
    visitorHash: "B",
    sessionId: "s-b1",
    utmSource: "linkedin",
  },
  {
    ...base,
    id: "v4",
    createdAt: new Date("2026-11-24T15:00:00Z"),
    path: "/",
    entityType: "HOME",
    entityId: null,
    country: "DE",
    browser: "Firefox",
    os: "Windows",
    visitorHash: "B",
    sessionId: "s-b2",
    durationMs: 10_000,
  },
  {
    ...base,
    id: "v5",
    createdAt: new Date("2026-11-24T20:00:00Z"),
    path: "/skills/react",
    entityType: "SKILL",
    entityId: "t-react",
    visitorHash: "C",
    sessionId: "s-c",
  },
  {
    ...base,
    id: "v6",
    createdAt: new Date("2026-11-24T20:01:00Z"),
    path: "/projects/pr1-slug",
    entityType: "PROJECT",
    entityId: "pr1",
    visitorHash: "C",
    sessionId: "s-c",
    durationMs: 50_000,
    scrollDepth: 100,
  },
  {
    ...base,
    id: "v7",
    createdAt: new Date("2026-11-25T23:59:00Z"),
    path: "/blog/p1-slug",
    locale: "en",
    entityType: "BLOG",
    entityId: "p1",
    deviceType: "MOBILE",
    browser: "Mobile Safari",
    os: "iOS",
    visitorHash: "D",
    sessionId: "s-d",
  },
];

export const FIXTURE_CLICKS: RawClick[] = [
  {
    createdAt: new Date("2026-11-24T08:04:00Z"),
    entityType: "PROJECT",
    entityId: "pr1",
    path: "/projects/pr1-slug",
    target: "GITHUB",
    visitorHash: "A",
  },
  {
    createdAt: new Date("2026-11-24T20:02:00Z"),
    entityType: "PROJECT",
    entityId: "pr1",
    path: "/projects/pr1-slug",
    target: "LIVE",
    visitorHash: "C",
  },
  {
    createdAt: new Date("2026-11-24T20:03:00Z"),
    entityType: "PROJECT",
    entityId: "pr1",
    path: "/projects/pr1-slug",
    target: "LIVE",
    visitorHash: "C",
  },
];
