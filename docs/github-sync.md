# GitHub sync

The projects section is fed from the owner's public GitHub repositories (Phase 5, task 1).
Code: `lib/github/*`; routes: `app/api/webhooks/github`, `app/api/cron/github-sync`; admin:
`/admin/projects`.

## Triggers

| Trigger                                      | When                                                                                                                                           | Scope            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| GitHub App webhook                           | push to the default branch, repository created / renamed / archived / made public or private / deleted, repositories added to the installation | that repository  |
| Admin "Sync now"                             | button on `/admin/projects` (all, one repository, or "reprocess README")                                                                       | all or one       |
| Vercel Schedule `github-sync` (Hobby: daily) | `0 3 * * *` UTC (Hobby adds up to 15 min jitter), `GET /api/cron/github-sync` with `Authorization: Bearer $CRON_SECRET`                        | all (safety net) |

The webhook answers immediately (202) and syncs in `after()`. Each run is recorded in
`GithubSyncRun` (admin "Recent runs"). Only one full run at a time; a run still marked RUNNING
after 10 minutes is closed as timed out. A full run stops after 240 s (functions have 300 s) with
status PARTIAL; the next run continues with the repositories that still need work.

## Policy (approved 2026-11-24)

- Public repositories of `GITHUB_OWNER` (default `Decuayer`). Forks and archived repositories are
  not imported unless enabled in the admin; a project that is already linked keeps syncing (an
  archived repository shows an "Archived" badge).
- Initial import: drafts. Repositories created after `GithubSyncSettings.autoPublishAfter` (the
  moment the Phase 5 migration ran) are published on import when they have a description and a
  README. After the import the sync never changes `published`; the admin decides.
- A repository that disappears (deleted, made private) unpublishes its project
  (`syncError = repoUnavailable`) so mirrored content of a private repository does not stay public.
- GitHub projects cannot be deleted in the admin (the next sync would bring them back); unpublish
  them instead.
- Overrides: `titleTr/En`, `summaryTr/En`, `descriptionTr/En`, `liveUrl`, `featured`, `order` are
  never written by the sync. Empty title and summary fall back to the repository name and
  description; `liveUrl` falls back to the repository homepage.
- Tags: topics become `GITHUB` links, languages (primary + those ≥ 10 %) `LANGUAGE` links (Phase 4
  rules). Manual tags and per-project hidden flags are kept.
- README language: shown as is, with a note on the Turkish page. The Turkish summary is the admin's
  override, else the GitHub description.
- Slug: from the repository name (lower case). A rename moves a slug that was derived from the old
  name; the old slug redirects (301) through `ProjectSlugHistory`.

## Change detection and cost

Repository metadata (description, topics, stars, …) comes with the repository list (one request
per 100 repositories) on every run. README, languages and the file tree are fetched only when
`pushed_at` changed, the README pipeline version changed (`README_PIPELINE_VERSION`), the last
sync failed, the repository was renamed, or the admin forced a reprocess. README and languages use
`If-None-Match`; a 304 does not count against the rate limit. An unchanged daily run costs one
request.

## README pipeline (`lib/github/readme/render.ts`)

remark (GFM: tables, task lists, strikethrough, autolinks, footnotes; emoji shortcodes) → rehype
with raw HTML → **rehype-sanitize with GitHub's schema** → URL rewriting and mirroring → GitHub
alerts (`> [!NOTE]` …) → Mermaid placeholders → heading ids and anchors → Shiki (light and dark
themes as CSS variables) → HTML stored in `Project.readmeHtml`. Nothing after the sanitizer adds
author-controlled markup. Fixtures and XSS tests: `lib/github/readme/*.test.ts`.

URL rules (`lib/github/readme/urls.ts`):

| Source                                                                | Result                                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `./a.png`, `a.png`, `../a.png`, `/a.png` (relative to the README)     | `raw.githubusercontent.com/{o}/{r}/{branch}/{path}` → mirrored |
| `github.com/{o}/{r}/raw/{ref}/…`, `…/blob/{ref}/…?raw=true`, raw host | normalised to the raw URL → mirrored                           |
| `github.com/user-attachments/…`, `(private-)user-images…`             | downloaded following redirects → mirrored                      |
| shields.io, badgen, workflow badges, codecov, …                       | kept external (CSP `img-src` allowlist), no referrer           |
| `<picture>` / `#gh-dark-mode-only`                                    | one image per theme, the site theme shows the right one        |
| relative links (`./CONTRIBUTING.md`)                                  | `github.com/{o}/{r}/blob/{branch}/{path}`, new tab             |
| PDF links in the repository                                           | `/projects/{slug}/docs/{id}` (site viewer)                     |
| `#anchor`                                                             | matches the generated heading ids                              |

## Media mirror (`lib/github/mirror.ts`)

Download (https only, size cap while streaming) → type from the bytes (png, jpeg, gif, webp, avif;
SVG is rasterised to PNG, because the public bucket would serve an SVG with scripts) → sha256 of
the original → reuse the `MediaFile` with the same `contentHash`, or optimise with sharp (longest
edge 2400 px, re-encode only when smaller, animated GIFs unchanged) → upload to
`media/github/{repo}/{sha256}.{ext}` → `MediaFile` (`source GITHUB`, `originUrl`, `repoFullName`,
size, blur placeholder). README usage is recorded in `MediaUsage` (field `readme`).

Limits (approved): images 10 MB, PDFs 25 MB. Larger files are not mirrored; the README links to
the original, and a too-large PDF is listed with a GitHub link. The `media` bucket limit is 25 MB
(`scripts/ensure-storage-bucket.ts`); admin uploads stay at 4 MB.

Unused mirrors are never deleted automatically: admin → Media → "Clean up unused" lists them and
deletes after confirmation.

## Documents

PDFs under `docs/` and PDFs the README links to become `ProjectDocument` rows (mirrored, or GitHub
link above 25 MB). Same blob sha = no download. The viewer is pdf.js (react-pdf) with page
navigation, zoom, full screen and download; it renders to canvas (works on iOS Safari). The worker,
fonts, CMaps and WASM decoders are copied to `public/pdfjs/` before `dev` / `build`
(`scripts/copy-pdfjs-assets.mjs`), so the CSP (`worker-src 'self'`) holds; `isEvalSupported` is off.
pdf.js 6 calls very new built-ins: the legacy build (Turbopack alias in `next.config.ts`) polyfills
most of them; `lib/pdf/polyfills.js` adds async-iterable `ReadableStream` (Safari) and
`Promise.withResolvers`, in the page and at the top of the worker. `ViewerBoundary` contains any
remaining viewer error so it never takes down the page.

## Mermaid

Rendered in the browser: `mermaid` is imported only when a README has a diagram and it scrolls into
view, with `securityLevel: "strict"` and the site theme. Pre-rendering during the sync would need a
headless browser. Verified under the production CSP by `e2e/github-project.spec.ts` (no
violations).

## Setup

### 1. GitHub App

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**:

- **Name**: any (e.g. `demircucu-sync`); **Homepage URL**: `https://www.demircucu.com`.
- **Webhook**: Active. **URL**: `https://www.demircucu.com/api/webhooks/github`.
  **Secret**: a random value (`openssl rand -hex 32`), kept for `GITHUB_WEBHOOK_SECRET`.
- **Repository permissions**: Contents → Read-only; Metadata → Read-only (mandatory). Nothing else;
  no account or organisation permissions.
- **Subscribe to events**: Push, Repository, Public. (Installation events arrive without a
  subscription.)
- **Where can this GitHub App be installed?** Only on this account.

After creating it: note the **App ID**, then **Generate a private key** (downloads a `.pem`).
Then **Install App** → your account → **All repositories** (new repositories are included
automatically; the sync reads public repositories only).

### 2. Environment variables

Vercel → Project → Settings → Environment Variables, **Production**:

| Variable                     | Value                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| `GITHUB_APP_ID`              | App ID                                                          |
| `GITHUB_APP_PRIVATE_KEY`     | content of the `.pem` (multi-line is fine)                      |
| `GITHUB_WEBHOOK_SECRET`      | the webhook secret                                              |
| `CRON_SECRET`                | random value (`openssl rand -hex 32`); Vercel Schedules send it |
| `GITHUB_APP_INSTALLATION_ID` | optional (looked up from the owner)                             |

Preview / staging: the same App credentials are enough for "Sync now" (no webhook, no schedule:
static schedules in `vercel.json` start active in Production only). Without credentials the sync is anonymous (60 requests per
hour), which is enough for a manual run with few changes. Redeploy after adding the variables.

### 3. First import

1. `scripts/link-existing-projects.ts` (dry run, then `--apply`): links existing projects to
   their repositories so the sync updates them instead of importing duplicates.
2. Admin → Projects → **Sync now**. New repositories arrive as drafts; publish the ones to show.
3. Admin → Projects → GitHub panel shows the webhook, cron and credential status.
