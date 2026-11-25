# Analytics

Self-hosted, cookieless page view analytics stored in the application's Postgres database
(decision of Phase 3: approach (a); raw rows 90 days, daily aggregates forever). There is no
third-party service and no new environment variable; the nightly job uses the existing
`CRON_SECRET`.

## Data flow

```
browser                         server                                   database
<Analytics /> ── POST /api/track ──> validate, filter ──> after(): record ──> PageView
   (view, engagement, outbound)       (204 always)                          OutboundClick
                                                                            AnalyticsSalt
Vercel Schedule 00:15 UTC ── GET /api/cron/analytics ──> aggregate finished days ──> DailyStat
                                                    delete raw > 90 days, old salts
                                                    BlogPost.viewCount += day's views
/admin, /admin/analytics/* ──> DailyStat (aggregated days) + same aggregation over raw rows
                               of the days after the last aggregated one (today)
```

### Client (`components/analytics/tracker.tsx`)

Mounted once in the locale layout (inside `Suspense`, `usePathname` can suspend). Per route:

- `view`: a random UUID (the page view id), the pathname, `document.referrer` on the first view
  only, `utm_source` / `utm_medium` / `utm_campaign`.
- `engagement`: visible time (paused while the tab is hidden) and the maximum scroll depth, sent
  with `sendBeacon` when the route changes, the tab is hidden or the page is unloaded. Values are
  running totals; the server keeps the maximum.
- `outbound`: clicks on links to other hosts, and on links marked `data-track="github|live|document"`
  (project GitHub/live buttons, attachments, document links and downloads).

Nothing is sent when `navigator.doNotTrack === "1"` or `navigator.globalPrivacyControl` is set,
and nothing on `/admin`, `/auth` or `/profile`. No cookie or storage is used.

### Endpoint (`app/api/track/route.ts`)

Order of checks; anything filtered still gets `204` so a client cannot tell why:

1. Same origin (`Origin`, or `Sec-Fetch-Site: same-origin` for beacons without `Origin`) → else 403.
2. Body ≤ 4 KB (413), JSON and the zod schema in `lib/analytics/payload.ts` (400).
3. `DNT: 1` or `Sec-GPC: 1`, `isbot` user agents (also an empty user agent and HeadlessChrome),
   prefetch headers (`Next-Router-Prefetch`, `Purpose` / `Sec-Purpose: prefetch`).
4. Admins: only requests carrying a Supabase auth cookie are checked (anonymous beacons never wait
   on Auth); `role = ADMIN` is not counted.
5. After the response (`after()`): rate limit `track-ip` (60 per minute per IP, Postgres), then the
   write.

### Recording (`lib/analytics/record.ts`)

- The path is classified (`lib/analytics/paths.ts`) and resolved to published content
  (`resolve.ts`). Drafts, hidden skills, unknown slugs, 404 probes and paths outside the known
  routes are not recorded. Project document pages count as `PAGE` (by path).
- Visitor hash: `sha256(daily salt, IP, user agent)`. One random salt per UTC day in
  `AnalyticsSalt`; past days' salts are deleted by the nightly job, so hashes cannot be linked to
  an IP afterwards or across days. The raw IP is never stored.
- Dedupe: the same visitor viewing the same path (any locale) within 30 minutes is counted once.
- Session: a view within 30 minutes of the visitor's previous view joins its session.
- Country from `x-vercel-ip-country`; device, browser and OS from the user agent
  (`ua-parser-js` 1.x, MIT; 2.x is AGPL); referrer reduced to its host, internal referrers dropped.
- Engagement and outbound beacons refer to the page view id and are accepted for 6 hours.

## Aggregation (`lib/analytics/aggregate.ts`, `job.ts`)

`aggregate()` is a pure function over raw rows; the nightly job writes its output to `DailyStat`
and the dashboard applies the same function to raw rows of days that are not aggregated yet, so
both paths give identical numbers.

`DailyStat` rows (`date`, `entityType`, `entityKey`, `dimension`, `value`, `views`, `visitors`):

| Entity key                   | Meaning                                   |
| ---------------------------- | ----------------------------------------- |
| entity id                    | PROJECT, BLOG, EXPERIENCE, SKILL (tag id) |
| path (`/` for the home page) | HOME, PAGE                                |
| `""` with entity type PAGE   | site totals                               |

| Dimension                                      | Value                                           | `views` / `visitors`                   |
| ---------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| `total`                                        | `""`                                            | views / distinct daily visitor hashes  |
| `referrer`                                     | host, `""` = direct/internal                    | same                                   |
| `utm`                                          | `utm_source`                                    | same                                   |
| `country`, `device`, `browser`, `os`, `locale` | value                                           | same                                   |
| `from`                                         | previous path in the session, `""` = entry page | same                                   |
| `outbound`                                     | GITHUB, LIVE, DOCUMENT, OTHER                   | clicks / distinct clickers             |
| `engagement`                                   | `duration`                                      | measured views / total seconds         |
| `engagement`                                   | `scroll`                                        | measured views / sum of depths (0-100) |
| `session`                                      | `""` (site only)                                | sessions / total engaged seconds       |

The job (Vercel Schedule `analytics`, `15 0 * * *` UTC; on Hobby it starts within 15 minutes):

- Aggregates every finished UTC day after the last aggregated one, in one transaction per day
  behind an advisory lock. Every aggregated day gets a site `total` row, even with zero views, so
  "aggregated" is always recorded; reruns are no-ops. Missed runs are caught up (up to 95 days).
- `BlogPost.viewCount` grows by each aggregated day's views; its pre-analytics value is kept.
- Deletes `PageView` / `OutboundClick` older than 90 days, never rows of days not yet aggregated.
- Deletes salts of past days.

## Dashboard

- `/admin`: KPIs (views, visitors, average session, average time on page, outbound clicks) with
  the change from the previous period of the same length; published content counts, comments,
  likes, unread messages, last GitHub sync; daily views with the previous period dashed; views by
  content type; most viewed content per type; referrers, countries, devices, browsers, operating
  systems, languages, campaigns, outbound targets; recent messages (unread marked, link opens the
  message), comments and sync runs.
- `/admin/analytics`: the same with every content item listed, and CSV export.
- `/admin/analytics/{project|blog|experience|skill}/{id}` and `/admin/analytics/pages?path=`: one
  item's series, breakdowns, average reading / engaged time and scroll depth, previous pages,
  traffic from skill pages, the content's skills, likes and comments in the range (blog),
  outbound clicks (projects), CSV export.
- Ranges: today, 7, 30, 90 days, 12 months, custom (max 400 days); days are UTC.
- Reads are cached for a minute (`"use cache"`, `cacheLife({ revalidate: 60 })`); every read
  calls `requireAdmin()` first. CSV: `GET /api/admin/analytics/export` (admin only; cells that
  would run as a spreadsheet formula are escaped).

### Reading the numbers

- Unique visitors over more than one day is the sum of daily unique visitors, because hashes
  change every day (by design). A visitor who returns on two days counts twice.
- Engagement averages only include views whose beacon arrived (closed tabs on some mobile browsers
  never send one).
- Today and (until 00:15 UTC) yesterday come from raw rows; numbers are final once aggregated.

## Tests

- Unit: path classification, request parsing (bots, DNT/GPC, prefetch, referrers), ranges and
  period comparison, aggregation and reductions against a known fixture
  (`tests/fixtures/analytics.ts`), CSV escaping, the tracker (views, engagement on navigation,
  opt-out, outbound clicks), chart and list empty/filled states.
- Integration (`tests/integration/analytics.int.test.ts`): recording, dedupe, sessions, beacons,
  the endpoint (privacy signals, bots, admins, cross-site, invalid payloads, rate limit), the job
  (fixture → expected rows, idempotency, catch-up, view counts, retention, salts), cron
  authorization, dashboard reads; admin reads are in the authorization matrix.
- E2E (`e2e/analytics.spec.ts`): a real visit without analytics cookies, engagement on
  navigation, DNT, outbound click, admins not counted, dashboard / detail / CSV, anonymous
  rejection, privacy page.
