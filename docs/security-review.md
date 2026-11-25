# Security Review

Living document. Each finding records status (verified / false alarm / accepted risk), impact,
remediation and the test that guards it. Last full review: 2026-11-24 (Phase 2,
`feat/phase-2-security-auth`).

## Summary

| #   | Finding                                               | Status                      | Remediation (Phase 2)                                                           | Guarded by                                                                      |
| --- | ----------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| S1  | Tables reachable through the Supabase Data API        | Verified (partly mitigated) | RLS without policies + REVOKE + default privileges; Data API off (owner, panel) | `tests/integration/rls.int.test.ts`, `tests/supabase/rls.supabase.test.ts`      |
| S2  | Session never refreshed, `middleware.ts` deprecated   | Verified                    | `proxy.ts`: next-intl + Supabase refresh, protected-route redirect              | `lib/auth/routes.test.ts`, `e2e/auth.spec.ts`                                   |
| S3  | Unprotected reads exported from `"use server"` files  | Verified                    | Reads moved to `lib/data/*` (`server-only`); admin reads call `requireAdmin`    | `tests/integration/authz-matrix.int.test.ts`                                    |
| S4  | Stored XSS through `dangerouslySetInnerHTML`          | Verified                    | One sanitizer (`lib/sanitize/html.ts`), applied on save and on render           | `lib/sanitize/html.test.ts`, authz-matrix "sanitizes rich text on save"         |
| S5  | No input validation, mass assignment in settings      | Verified                    | zod schema per action, `.strict()` settings allowlist, error codes only         | `lib/actions/result.test.ts`, authz-matrix "error responses"                    |
| S6  | Upload accepts any type, unvalidated folder           | Verified                    | Magic-byte type detection, allowlist, folder enum, per-type limits, CSRF check  | `lib/upload/policy.test.ts`, `lib/media/ingest.test.ts`, `e2e/security.spec.ts` |
| S7  | No rate limiting or spam protection                   | Verified                    | Postgres fixed-window limiter, contact honeypot, slow failed sign-ins           | `tests/integration/rate-limit.int.test.ts`                                      |
| S8  | Client-chosen `revalidatePath`, no comment moderation | Verified                    | Cache tags derived on the server, comment length limit, admin hide/delete       | `tests/integration/cache-invalidation.int.test.ts`                              |
| S9  | Registration gaps (policy, orphans, flows)            | Verified                    | zod + password policy, `auth.users` trigger, callback, reset and verify pages   | `tests/supabase/profile-trigger.supabase.test.ts`, `e2e/auth.spec.ts`           |
| S10 | No security headers / CSP                             | Verified                    | CSP (allowlist, no nonces) + SRI, HSTS, nosniff, Referrer/Permissions-Policy    | `lib/security/headers.test.ts`, `e2e/security.spec.ts`                          |
| S11 | Service-role client created at import time            | Fixed in Phase 1            | Lazy, `server-only`; now also accepts the new `sb_secret_` keys                 | `lib/supabase/storage.test.ts`                                                  |
| S12 | Unbounded `pg` pool in serverless                     | Fixed in PR #2, extended    | Pool max 3, build max 1, session pooler (5432) rejected at runtime              | `lib/db/pool-config.test.ts`, `tests/integration/db-pool.int.test.ts`           |

## Findings

### S1: Supabase Data API exposure (critical)

- **Verification (2026-11-24).** Production: RLS disabled on all 14 tables in `public`; `anon` and
  `authenticated` have no schema USAGE and no table privileges, so PostgREST answered
  `42501 permission denied for schema public`. The Data API itself was still enabled. Staging (a
  newer project) had PostgreSQL 15 defaults: `PUBLIC` holds USAGE on `public`, so the client roles
  inherited it.
- **Impact.** With any grant added by mistake (or a new project's defaults) the publishable key would
  read or write every table, including `Profile.role`.
- **Remediation.** Migration `20261124004800_rls_lockdown`: RLS on every table in `public` without
  policies (Prisma connects as the table owner, which bypasses RLS); `REVOKE ALL` on tables,
  sequences, functions and the schema for `anon`/`authenticated`; `REVOKE ALL ON SCHEMA public FROM
PUBLIC` (no-op on production, whose ACL is already owner-only); `ALTER DEFAULT PRIVILEGES`
  revoking future grants. Plain PostgreSQL (CI) has no client roles: only RLS is applied there.
  Disabling the Data API is a panel step for the owner (see "Owner actions").
- **State.** Local Supabase and staging: applied and verified with `scripts/verify-db-lockdown.ts`
  (no table without RLS, client roles without usage or table privileges). Production: pending
  approval.
- **New tables.** The integration test fails for any table in `public` without RLS, so every future
  migration must enable it.

### S2: Session refresh and proxy

- `middleware.ts` replaced by `proxy.ts`. It refreshes the Supabase session (`getClaims()`, which
  rotates tokens and writes cookies with `Cache-Control: private, no-store`) only when an
  `sb-*-auth-token` cookie exists, so anonymous page views never wait on Auth.
- `/[locale]/admin/**` and `/[locale]/profile/**` redirect anonymous visitors to the login page with
  a validated `next` parameter. This is a convenience; authorization happens on the server.
- Server code verifies the user with `auth.getUser()` (`lib/auth/session.ts`), never with
  `getSession()`. The call waits for `connection()`, so it never runs during a prerender.

### S3: Data access layer

- Public reads: `lib/data/{projects,experiences,posts,settings,interactions}.ts`, all `server-only`,
  cached with `"use cache"` + `cacheTag`, filtered to published content.
- Admin reads: `lib/data/admin.ts`; every function calls `requireAdmin()` itself, so admin pages
  stay protected even though layout and page render in parallel.
- `incrementViewCount`, `getAllBlogPostsForAdmin`, `getAllProjectsForAdmin`,
  `getAllExperiencesForAdmin` and `getPostInteractions` are no longer server actions.
  `"use server"` files now contain only mutations, each starting with a guard.
- One admin check: `requireAdmin()` / `requireAdminPage()` in `lib/auth/guards.ts` (the three
  copies are gone). `getCurrentUser` is deduplicated per request with React `cache`.

### S4: Stored XSS

- `lib/sanitize/html.ts`: unified + rehype-sanitize with GitHub's allowlist. Removes `<script>`,
  `<style>`, `<iframe>`, `<object>`, forms, event handlers, inline styles and `javascript:` / `data:`
  URLs, prefixes ids (DOM clobbering), and forces `rel="noopener noreferrer nofollow"` on links that
  open a new tab.
- Applied when content is saved (zod transforms) and again when it is read for rendering (blog
  content, project and experience descriptions, about bio), so rows written before Phase 2 are safe
  too. Phase 5 reuses it for READMEs.

### S5: Validation and error handling

- Every server action validates with zod (`lib/validation/*`). Site settings use a `.strict()`
  allowlist: unknown columns are rejected (`invalidInput`).
- Actions return `{ error: <code> }`; codes are translated on the client (`errors.*`). Prisma,
  Supabase and network errors are logged on the server and reported as `serverError` only.
- Existing data note: the `game-catalog` project's `githubUrl` contains pasted prompt text; saving
  that project now fails URL validation until the field is corrected in the admin panel.

### S6: Uploads

- `lib/upload/policy.ts`: the type is detected from magic bytes (`file-type`), never from the name
  or client MIME type. Allowed: PNG, JPEG, GIF, WebP, AVIF (10 MB), ICO (512 KB), PDF (25 MB).
  SVG and HTML are rejected.
- Phase 6: signed direct uploads. `POST /api/upload/sign` (admin, same origin) returns a one-time
  URL for `incoming/<uuid>`; the browser puts the file there (no function body limit); `POST
/api/upload` downloads it, applies the policy, processes images with sharp (EXIF/GPS always
  removed, longest edge 2400 px) and stores the result at `<folder>/<sha256>.<ext>`. The incoming
  object is always deleted; abandoned ones are purged after a day. Identical content reuses the
  existing `MediaFile`. `folder` is an enum; files are stored with
  `Cache-Control: max-age=31536000`; if the database insert fails the stored object is removed.
- The image optimizer (`next/image`) only fetches the project's `media` bucket path and GitHub
  avatars (`lib/media/image-config.ts`), so `/_next/image` cannot be used as an open proxy.
- `/api/upload` and `/api/upload/sign` check `Origin` against the host (CSRF) before authentication.
- Storage-level second layer: `scripts/ensure-storage-bucket.ts` sets the bucket's MIME allowlist
  and size limit. Applied on staging; production pending (owner action).
- **Staging verification with `sb_secret_` key:** upload, public read (`200 image/png`,
  `public, max-age=31536000`) and delete succeeded (`scripts/verify-storage.ts`). The staging
  project had no `media` bucket (the old code created it on first upload); it was created by the
  script.

### S7: Rate limiting

- Decision: Postgres-backed limiter, no Turnstile (owner, 2026-11-24).
- `lib/rate-limit`: one atomic `INSERT ... ON CONFLICT` per check (fixed window), keys are
  `<policy>:<sha256(identifier)>` (no raw IPs or e-mails stored), rows older than 25 hours are pruned
  opportunistically. Fails open if the database is unreachable.
- Limits (`lib/rate-limit/policies.ts`): login 20 / 15 min per IP, 5 / 15 min per account and IP,
  50 / 15 min per account (the per-account limit alone let anyone lock the admin out with five
  wrong passwords; found on the Preview, fixed before production);
  register 3 / hour per IP; password reset and resend 5 / hour per IP and 3 / hour per account;
  contact 3 / 10 min and 10 / day per IP; comments 5 / min and 50 / day per user; likes 30 / min per
  user.
- Failed sign-ins take at least 800 ms; one generic message for unknown e-mail and wrong password.
- Contact form: hidden honeypot field; filled submissions are accepted silently and discarded.

### S8: Cache invalidation and comments

- `addComment` / `toggleLike` take only `{ postId, ... }`. The post must exist and be published;
  the tag `post-interactions:<id>` is derived on the server. The map of mutations to tags is in
  `lib/cache/tags.ts` and checked action by action in the integration tests.
- Comments: 2000 character limit; `Comment.hidden` with admin hide, show and delete
  (`/admin/comments`); hidden comments are not shown publicly.
- Shared cache (Preview finding). The default `"use cache"` handler is in-memory per instance and
  tracks tag expirations locally. On Vercel, admin edits regenerated the public list page from
  stale data in 2 of 4 tries, and the CDN kept it for the full `cacheLife`. Tagged data functions
  now use `"use cache: remote"` (guarded by `lib/cache/directives.test.ts`), and `invalidate()`
  expires the same tags again 5 s after the response (`after()`), because a tag expiry needs
  ~2-3 s to reach every instance. Measured afterwards: 7 of 7 edits fresh on the first request;
  `e2e/preview-admin-cache.spec.ts` runs on every Preview and fails if an edit is not visible
  within 15 s or does not stay visible.

### S9: Registration and auth flows

- Decision: registration stays open, e-mail + password (owner, 2026-11-24).
- Password policy: at least 10 characters with lower-case, upper-case and digit (zod and the
  Supabase setting must match), 72 bytes maximum (bcrypt).
- Profiles are created by the `auth.users` insert trigger (migration
  `20261124004900_auth_profile_sync`, functions in the non-exposed `app_private` schema): same
  transaction, role always `USER` (metadata is never trusted), display name sanitized and
  truncated, `ON CONFLICT DO NOTHING` so a stale row never blocks sign-up. E-mail changes are
  mirrored; deleting an auth user deletes the profile. Existing users without a profile are
  backfilled (production: 0).
- New pages: `/[locale]/auth/callback` (token_hash `verifyOtp` and PKCE `exchangeCodeForSession`,
  validated `next`), forgot password, reset password, check e-mail (with resend) and confirmed.
- Sign-out redirects to the current locale.

### S10: Security headers and CSP

- Production content audit (read-only, `scripts/audit-content-hosts.ts`, 2026-11-24): every image
  is in the project's own storage bucket except one experience logo hotlinked from
  `statics.vestel.com.tr`, which no page renders today. Plain links (GitHub, LinkedIn, Instagram,
  customer sites) are not affected by CSP. No CSP change needed.

- Decision: allowlist CSP with Subresource Integrity, enforced, no nonces (owner, 2026-11-24).
  Nonces would make every page dynamic, which contradicts Cache Components. App Router emits inline
  RSC scripts, so `script-src` contains `'unsafe-inline'`; protection against injected scripts
  comes from the sanitizer (S4).
- Policy (`lib/security/headers.ts`): `default-src 'self'`; images and `connect-src` only from the
  project's own Supabase origin (no `*.supabase.co`) and `avatars.githubusercontent.com`;
  `object-src 'none'`, `frame-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `upgrade-insecure-requests`. Vercel toolbar origins on Preview only;
  `unsafe-eval` in development only.
- Also: HSTS (2 years, subdomains, no preload), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, restrictive
  `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`.
- **Known gap.** `experimental.sri` in Next 16.4.6 leaves some server-rendered chunks without an
  `integrity` attribute (8 of 19 on `/tr`). The hashes that are present are verified against the
  served files in E2E.
- **To check before enforcing on production.** Existing content may reference images on other
  hosts (for example pasted URLs in blog posts); those would be blocked. The automated host count on
  production was not run (it needs the owner's permission).

## Other changes and findings

- **Tag editing bug (pre-existing).** The tag selector derives slugs from names (`Next.js` ->
  `next-js`), missed the existing `nextjs` tag and then failed on the unique name: editing tagged
  content returned an error. The server now matches existing tags by slug or name
  (`connectTags`). Replaced by the canonical tag system in Phase 4.
- **Experience end date.** Clearing the end date in the form did not clear it in the database;
  fixed (`endDate ?? null`).
- **Media delete.** The row is kept when deleting the storage object fails, so the delete can be
  retried (previously the row was deleted and the object leaked).
- **Preview isolation.** `lib/env/preview-guard.ts` refuses to build (`next.config.ts`) or start
  (`instrumentation.ts`) a Preview deployment whose `NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL` or
  `DIRECT_URL` belongs to the production project. Only a SHA-256 of the production ref is stored.
- **Build safety.** During `next build` every Prisma write raises `BuildWriteError`
  (`lib/db/build-guard.ts`); CI builds through a SELECT-only role. Build workers use one
  connection each; a Supabase session-pooler URL (port 5432) is rejected.
- **Soft 404 (accepted trade-off of Partial Prefetching, owner decision 2026-11-24).** The first
  request for an unknown slug is answered from the route's fallback shell, so the status is 200 with
  `<meta name="robots" content="noindex">` and the not-found UI; later requests get a cached 404.
  `e2e/smoke.spec.ts` checks noindex on the first and second request with a fresh slug per run, and
  that unknown slugs never appear in `/sitemap.xml` (no sitemap yet; it lands in the SEO phase).
- **Read-your-own-writes under `next start`.** After `updateTag`, the first request may still
  receive the build-time prerender; the next one is fresh (local only; on Vercel see S8).

## Dependency audit

Last reviewed: 2026-11-24 (`npm audit`, Phase 2 dependencies added: zod, file-type, unified,
rehype-parse, rehype-sanitize, rehype-stringify, unist-util-visit; next-intl 4.16; Next pinned to
16.4.6, the latest 16.x).

| Severity | Package (path)                                        | Advisory                                                                                                   | Status                  |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------- |
| High     | `effect` (`prisma` -> `@prisma/config` -> `effect`)   | [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw) ReDoS in `Schema.TemplateLiteral` | Accepted (dev-only)     |
| Moderate | `postcss-selector-parser` (`@tailwindcss/typography`) | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)                                   | Accepted (build-only)   |
| Moderate | `minimatch` (`shadcn` -> `ts-morph`)                  | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)                                   | Accepted (dev-only CLI) |

No new findings from the Phase 2 dependencies.

### Rationale

- **`effect`.** Only a dependency of the Prisma CLI configuration loader; not imported by
  `@prisma/client`, the generated client, `@prisma/adapter-pg` or the server bundle. It parses
  schema definitions written by this repository, never user input. The only fix is a Prisma 6
  downgrade.
- **`postcss-selector-parser`.** Runs only while Tailwind compiles repository CSS at build time.
- **`minimatch` via `shadcn`.** `shadcn` is a devDependency used as a generator CLI.

### Re-check policy

Re-run `npm audit` on every Prisma, Tailwind or shadcn upgrade and update this table. Any finding
that reaches the production server bundle is fixed, not accepted.

## Secret scanning

gitleaks v8.28.0 over the full history (38 commits, 2026-11-24): no leaks. Local Supabase test keys
are read from `supabase status` at runtime and never committed.

## Operational safeguards

- `scripts/assert-local-db.ts` blocks `db:migrate`, `db:seed` and `db:reset` unless every database
  variable points at a local host. Covered by `scripts/lib/local-db.test.ts`.
- `db:migrate:staging` (`scripts/migrate-staging.ts`) requires `DB_TARGET=staging`, checks every
  database variable against the staging ref (from `.env.staging.local` or the
  `STAGING_SUPABASE_REF` secret) and always refuses production. Covered by
  `scripts/lib/staging-target.test.ts`.
- `scripts/verify-db-lockdown.ts`: read-only report of RLS, client-role access, auth triggers and
  orphaned users for any environment.
- Integration, Supabase and E2E tests refuse non-local databases.
- Production backups are stored outside the repository with owner-only permissions (0600).
