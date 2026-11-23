# Security Review

Living document. Each finding records status (verified / false alarm / accepted risk), impact,
remediation and the test that guards it. Phase 2 completes sections S1–S12.

## Dependency audit

Last reviewed: 2026-11-24 (`npm audit`, after upgrading Next.js to 16.4.6 and Prisma to 7.10.1).

| Severity | Package (path)                                        | Advisory                                                                                                   | Status                  |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------- |
| High     | `effect` (`prisma` -> `@prisma/config` -> `effect`)   | [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw) ReDoS in `Schema.TemplateLiteral` | Accepted (dev-only)     |
| Moderate | `postcss-selector-parser` (`@tailwindcss/typography`) | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)                                   | Accepted (build-only)   |
| Moderate | `minimatch` (`shadcn` -> `ts-morph`)                  | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)                                   | Accepted (dev-only CLI) |

### Rationale

- **`effect` (3 high entries: `effect`, `@prisma/config`, `prisma`).** `effect` is only a
  dependency of the Prisma CLI configuration loader. It is not imported by `@prisma/client`, the
  generated client, `@prisma/adapter-pg` or the Next.js server bundle (verified by searching
  `node_modules/@prisma/client/runtime`, `node_modules/.prisma/client` and `.next/server`; no
  references). The vulnerable code path parses schema definitions written by this repository,
  never user input. `npm audit` offers no fix other than downgrading Prisma to 6.x.
- **`postcss-selector-parser`.** Runs only while Tailwind compiles CSS from files in this
  repository at build time. No runtime exposure.
- **`minimatch` via `shadcn`.** `shadcn` is a devDependency used as a component generator CLI;
  only its stylesheet is imported at build time.

### Re-check policy

Re-run `npm audit` on every Prisma, Tailwind or shadcn upgrade and update this table. Any finding
that reaches the production server bundle is fixed, not accepted.

## Database exposure (S1, preliminary)

Verified 2026-11-24 with read-only catalog queries against production:

- RLS is disabled on all application tables in `public`.
- The `anon` and `authenticated` roles have no `USAGE` on schema `public` and no table privileges;
  `public` has no default ACLs. PostgREST therefore cannot read or write these tables today.
- `_prisma_migrations` (created by the baseline) is likewise inaccessible to `anon` / `authenticated`.

Defence in depth (enabling RLS without policies) is decided in Phase 2.

## Operational safeguards

- `scripts/assert-local-db.ts` blocks `db:migrate`, `db:seed` and `db:reset` unless every database
  variable (`DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL`) points at a local host. It never
  prints connection strings. Covered by `scripts/lib/local-db.test.ts`.
- Integration and E2E tests refuse non-local databases.
- Production backups are stored outside the repository with owner-only permissions (0600).
- Git history scanned with gitleaks (v8.28.0, 2026-11-24): no findings.
