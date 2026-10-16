# Nunes Instrumentation ServiceDesk

## Verified source update — 16 October 2026

Public source repository: https://github.com/Sivanesanbalu/nunes-instrumentation-servicedesk-

- Next.js build and TypeScript validation pass locally. Dependencies are pinned with a committed lockfile; use Node 22 or 24 and `npm ci`.
- Run `npm test` (pricing) and `npm run test:security` (utilities/security plus isolated PostgreSQL workflow tests).
- PostgreSQL tests use PGlite with simulated `auth.uid()` and synthetic records. They apply SQL in order and test customer/job intake, pricing boundaries, owner approval, manual sharing confirmation, repair/QA/delivery, and access denials. They do not validate hosted Supabase Auth, PostgREST, concurrency or browser flows.
- Migration order for a NEW dedicated staging project: `supabase/schema.sql`, `supabase/phase2.sql`, `supabase/phase5_quotation_uniqueness.sql`. Existing projects require a separately reviewed upgrade migration; do not rerun bootstrap SQL over real data.
- Hosted staging is not configured yet. No live authentication or customer workflow verification is claimed.
- Set only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Vercel Preview after staging provisioning. Never use a service-role key in browser variables. Keep Vercel Authentication enabled for all deployments. No production deployment is authorized by this update.
- Provision the first staging owner through Supabase administration. New accounts default to inactive viewer; signup cannot self-promote.
- Pricing remains: effort below 30% uses manual labour; 30–50% uses manual review/labour; above 50% charges 50% of product value. Quotes at/above the configured approval threshold require an owner. Sharing is manual and is not proof of external delivery.
- UI print/WhatsApp actions are unavailable while owner approval is pending. SQL blocks premature share confirmation.
- PostCSS is overridden to 8.5.30 to address dependency audit findings; revisit the override when upgrading Next.js.
- Customer records and credentials are not source files. `.env.example` contains placeholders only.

The historical phase notes below describe earlier snapshots and are superseded by this status.

# Nunes ServiceDesk Web — migration foundation (not production-ready)

Next.js 15 + Supabase migration of the existing FastAPI ServiceDesk. This is a **new frontend foundation**, not a completed migration. Includes real Supabase authentication, database-backed customer creation and service job intake, owner metrics, read-only job and quotation listing, and deterministic pricing preview. SQL RLS deliberately blocks direct status and quotation writes until hardened RPCs are implemented in the next milestone.

## Run locally
1. Create a **new** Supabase project (do not run schema.sql against the existing Lovable database, which has a different schema).
2. In SQL Editor run `supabase/schema.sql`. Turn OFF public signup or restrict it to invited company employees.
3. Register the intended first owner in Supabase Auth, then in SQL Editor execute `update public.staff set role='owner',active=true where id='<AUTH_USER_UUID>';` only for your verified account.
4. `cp .env.example .env.local` and fill in public Supabase URL and publishable key. Never put a service role key in NEXT_PUBLIC_ variables.
5. `npm install && npm test && npm run dev` and open http://localhost:3000.
6. Deploy only after server-side quote/status RPCs, private file storage, rate limiting, role-based tests, backup/restore rehearsal, secure monitoring and UAT are complete.

## Safety
No existing company/customer data migrated. No external messages sent. No public deployment. SQL intentionally has no direct browser quote insert/update or job status update permission. Service accounts begin inactive viewers, owner activation is manual. The quoted value in the UI is a preview, not a persisted quotation.

## Pending
- secure server-side quote calculations and job transition RPCs (all status updates)
- owner quote approval, audit logs, PDFs and email delivery
- private file attachments, staff administration, dashboard reporting details
- production checks, deployment, and import of legacy SQLite records

## Phase 2 (2026-10-16) — quotation and service operations

- Apply `supabase/phase2.sql` **after** `supabase/schema.sql` to a newly provisioned, dedicated Supabase database. Take a backup before migrations. SQL has not been applied remotely by this package.
- Operations tab: record inspection, create a server-calculated quote, and move jobs through guarded states.
- Quotations: owner approval where the quote total reaches the configured threshold (default ₹10,000), manual sharing confirmation, and customer acceptance/rejection with notes.
- Owner reports: client-side filtered export of most recent 500 jobs. NOT a full reporting backend.
- Manual sharing confirmation is a human attestation and **does not send messages**.
- Important: staff provisioning remains a manual privileged setup operation in the Supabase admin console, and role administration / verified email delivery / true historical reporting require further work.
- `service_settings` has owner-only row update policy; SQL verification and an end-to-end integration run against a staging Supabase instance remain required before production.

## Phase 3 — printable quotations and manual WhatsApp drafts

- Staff can open **Quote PDF & WhatsApp**, look up an existing quotation by reference, and print/save the full customer/product/tax breakdown to a PDF using the browser print dialog.
- A WhatsApp draft is generated only for valid Indian mobile phone numbers. The draft contains the quotation reference and estimated total, **not** an attachment. Staff must manually attach the printed PDF and actually send it using WhatsApp; they should record that action separately after confirming it occurred.
- Existing Supabase RLS continues to guard quotation reads. Printing does not modify quotation status.
- This is a source update only. Integration requires Supabase schema + phase2.sql to be applied to a dedicated database and is not yet externally verified. `npm install`, full Next.js build and end-to-end browser tests remain required before live production usage.

## Phase 4 — verification and safety hardening (2026-10-16)

- Added server-side active quotation duplication guard to `supabase/phase2.sql`; do not reapply the entire phase2 migration to an already migrated production database, because its CREATE POLICY statements are not idempotent. For new projects, run schema.sql then phase2.sql in order.
- Labeled owner dashboard figures as *loaded* and disclosed the 500-row per-category cap to avoid treating partial data as full totals.
- Added `npm run check:source` for dependency-free static structural checks.
- Dependency installation was blocked by an npm registry DNS failure (`EAI_AGAIN`). Next.js build, runtime E2E tests, and remote Supabase integration are **not verified**. Do not deploy publicly or import real customer data yet.
- Before production release: turn this guard into a separate controlled migration for any live instance, add robust database uniqueness indexes and verify with live Postgres transaction tests, configure invitation-only staff onboarding, and run build + comprehensive security/UAT.

## Phase 5 — deployment gates and race-safe quotation uniqueness

- `supabase/phase5_quotation_uniqueness.sql` adds a partial unique index preventing **simultaneous** active quotations for one service job. Apply once, after earlier migrations, first to a test database. The migration fails safely if duplicates already exist; investigate and resolve them instead of automatically deleting customer quotations.
- `npm run preflight` validates local environment configuration and the presence of migrations and installed packages. It intentionally **fails** if `.env.local` or dependencies are missing; it cannot prove remote permissions or deployment readiness.
- `.github/workflows/validate.yml` provides build/typecheck/test validation for pushes and pull requests when source is connected to GitHub. No GitHub push has been made in this phase.
- Build has **not** passed in this environment because npm registry DNS lookup returned `EAI_AGAIN`. No Supabase migration has been applied remotely and no live deployment is claimed.

## Phase 6 CSV export security

Report CSV exports use `lib/report-csv.mjs` to quote arbitrary text and prefix formula-like input with an apostrophe, mitigating spreadsheet formula execution from customer-supplied product names. Run `npm run test:security` (no npm dependencies required for the test runner). Report export still covers **only the currently loaded 500 jobs**, not complete historical reports.

**Build status:** The environment cannot resolve `registry.npmjs.org` (`EAI_AGAIN`); production Next.js build and live Supabase integration are **not** verified.

### Phase 7: India timezone reporting fix
- Dashboard's Received Today KPI groups timestamps by `Asia/Kolkata`, not the viewer's locale or UTC.
- Owner Reports date filter uses the same IST calendar-day semantics.
- Run `npm run test:security` to verify midnight boundary and CSV injection tests.
- This patch does not demonstrate a successful Next.js production build or Supabase integration. Run `npm ci && npm run typecheck && npm run build` in a connected CI runner prior to production.

## Phase 8 — Intake validation (2026-10-16)
- Added shared client-side validation for Indian mobile numbers, customer identity/email and instrument intake price/effort.
- 13/13 dependency-free security and validation tests passed.
- npm packages, full Next.js build, live Supabase integration and deployment are NOT verified.
- This validation is supplementary; database constraints and RLS remain necessary.


## Phase 9 — security and build verification

- Added `next.config.mjs` with basic browser security headers and disabled the `X-Powered-By` header.
- Added `tests/deployment-config.test.mjs` for security-header configuration and environment-file hygiene.
- Check with `npm run test:security` and `npm run check:source`.
- **Not a production certification:** CSP, rate limiting, RLS integration testing, secret management, actual mail delivery, database migrations, and disaster recovery require further work.
- `npm install` could not run in the current sandbox because its dependency cache is incomplete and access to npm registry is unavailable. No Next.js build or live integration success is claimed.

## Phase 10 — CI migration contract checks

Run `npm run check:migrations` to inspect the three ordered SQL scripts for expected RLS and RPC declarations, concurrency uniqueness index, and accidentally destructive DROP/TRUNCATE statements. GitHub Actions now runs this check before source checks and compilation. These are static contract assertions, not substitutes for applying SQL to a disposable Supabase staging project and testing role permissions.

The deployment blockers remain unchanged: no verified npm dependency install/full production build, no connected staging Supabase credentials, no approved Nunes repository or live Vercel deployment. Never add real customer PII until the live environment and role permissions have been validated.


## Phase 11 release audit / rollout gate

Run `npm run release:audit`, `npm run test:security`, and `npm run check:migrations` before promoting a release. The release audit verifies required files, CI steps, `.gitignore`, and SQL migration ordering; it prints SHA-256 hashes so operators can compare exact source versions. It does **not** prove SQL will execute successfully or that row-level policies are secure.

Before any real-data deployment: create a dedicated **private** GitHub repository, add this source, run CI with network access, create an isolated Supabase staging project, review and apply migrations strictly in this order: `schema.sql`, `phase2.sql`, `phase5_quotation_uniqueness.sql`. Bootstrap an owner only via a trusted Supabase administrator. Test access permissions and the complete customer-to-delivery workflow using synthetic customer data. Finally configure Vercel variables, restrict staff sign-in, and perform a backup restore rehearsal. Do not publish an unauthenticated instance.

**Current status:** Release audit and focused tests only. npm install/Next.js full build and live Supabase integration are blocked until the build environment can reach the npm registry and staging credentials exist. No GitHub push or live deployment has been performed.

## Phase 12 — staging reachability (read-only)

Run `npm run smoke:staging` after setting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your shell or CI secret store. This checks only the Supabase Auth settings endpoint, times out after 10 seconds and does not access customer data. **A PASS only means that endpoint is reachable**, not that migrations, row-level policies, user logins or service workflows work. This script will fail if variables are missing or placeholders are used. Do not commit `.env.local` or sensitive credentials. Keep customer data private and verify RLS and end-to-end workflows with synthetic staging records before inviting real company users.

## Phase 13 — authentication lifecycle hardening (2026-10-16)

- Supabase `onAuthStateChange` does not invoke `getUser()` synchronously within the callback. The authenticated reload is queued to avoid auth-lock reentrancy/hangs.
- When the user signs out, customer, job, quote and staff state is cleared. In-flight loads are invalidated by a generation counter to prevent stale records reappearing after sign-out/account switching.
- `npm run test:security` includes source-level lifecycle guards. These tests **do not replace** browser-based authentication integration tests, which still require a configured staging Supabase project.
- No production deployment or live database migration is included in this source release.

### Phase 16 — report export integrity

The owner CSV export now requests an exact database row count and fails closed if the server caps a page, omits the count, or the count changes between page requests. This protects against silently incomplete exports. It is **not a transactionally consistent snapshot** if rows change without altering the count; for audit-grade exports use a server-side repeatable-read snapshot. Targeted tests: `node --test tests/*.test.mjs`. Full Next.js build and Supabase staging integration remain unverified.

## Phase 17 pre-push review

Before uploading source, run `npm run prepush:safety`. This catches common secret-file names, local database artifacts and obvious hardcoded keys. It is **not** a complete secret scanner; also review changes manually and configure GitHub secret scanning. The CI workflow invokes this check. Offline Node tests can run with `node --test tests/*.test.mjs`; full Next.js build still requires npm dependencies and validated Supabase staging credentials.

## Phase 18 — Shared-computer logout safety
- Sign-out clears customer, job, quote and staff state **before** awaiting Supabase network sign-out.
- Pending deferred auth callbacks are cancelled on sign-out and component unmount. Load-version tokens prevent late responses from restoring prior account data.
- `tests/logout-safety.test.mjs` checks the logout cleanup contract; all targeted `.mjs` tests pass offline.
- This is **not** a full browser security test or proof of production readiness. Supabase staging, Next.js build and remote deployment still need validation.

## Nunes Instrumentation release status (October 2026)
- Company-facing label, quotations and CSV filename have been renamed to **Nunes Instrumentation**.
- Historical PostgreSQL job codes `NS-...` and quotation codes `NQ-...` intentionally remain stable to avoid incompatible identifiers. These are codes, not company display names.
- Targeted automated tests and static security contracts pass. They are not a substitute for applying SQL to a staging database and running end-to-end tests.
- **Not production complete:** npm registry access fails with `EAI_AGAIN`, so full `npm run build` cannot be verified here. No authenticated Supabase staging environment, production environment variables, confirmed email delivery, or deployed URL exists yet.
- Do not use real customer information until migrations, RLS, access control and backup recovery are validated against a live staging environment.
