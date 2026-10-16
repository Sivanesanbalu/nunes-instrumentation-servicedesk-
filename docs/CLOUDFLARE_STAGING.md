# Cloudflare Workers staging — Nunes Instrumentation ServiceDesk

## Status (2026-10-16)

OpenNext build and Wrangler packaging have been verified locally. Cloudflare deployment,
GitHub integration, Access policy and hosted workflow testing are **not yet verified**:
Cloudflare dashboard and Wrangler require authentication. No live URL is claimed.

## Runtime and reproducible build

Next.js 15.5.28 is supported by the pinned `@opennextjs/cloudflare` 1.20.12 adapter.
Wrangler is pinned to 4.151.1. Use Node 22 or 24 and the committed npm lockfile.
The existing `open-next.config.ts` retains the default cache configuration; no R2,
KV, D1, queues or paid resources are provisioned.

```sh
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run test:security
npm run build:cloudflare
npm run check:cloudflare
```

`build:cloudflare` runs the Next.js production build and produces `.open-next/worker.js`
and `.open-next/assets`. `check:cloudflare` packages without uploading. Generated
artifacts, `.dev.vars*`, `.env*` (except `.env.example`) and local Wrangler state
are excluded from git. GitHub validation builds the Cloudflare artifact with dummy
client settings; that CI artifact is not suitable for live use.

## Supabase configuration

Use only existing project `nunes-instrumentation-staging` (`lavczrblzvjaaizudzku`).
Its public API URL is `https://lavczrblzvjaaizudzku.supabase.co`.
The initial schema, service workflow and quotation uniqueness migrations are
already recorded in hosted staging; do not recreate the project or reapply them blindly.

Configure both Worker runtime variables and Workers Builds variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The staging API URL above |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The project's enabled modern publishable key |
| `NEXT_TELEMETRY_DISABLED` | `1` (build environment) |

The existing variable name accepts a modern `sb_publishable_` key. Never use a
service-role or secret key. Values are intentionally not committed. Next.js embeds
`NEXT_PUBLIC_*` during the build, so changing only runtime variables is insufficient.
`deploy:cloudflare` preserves dashboard runtime variables with `--keep-vars`.

## Connect and protect staging

1. Authenticate to the intended Cloudflare account and verify its Workers Free plan.
   Stop if any step requires payment or an upgrade.
2. Create/select Worker `nunes-instrumentation-servicedesk-staging`. Connect only
   `Sivanesanbalu/nunes-instrumentation-servicedesk-`, using a dedicated staging
   branch. Build command: `npm run build:cloudflare`; deploy command:
   `npm run deploy:cloudflare`; root directory: repository root.
3. Set the build/runtime variables above before building. Keep automated deployments
   off until the staging branch and access policy are configured.
4. `wrangler.jsonc` deliberately disables `workers_dev` and `preview_urls`.
   An initial upload therefore has no public route. Configure Worker-level Cloudflare
   Access with an explicit allowlist of authorized testers before exposing a route.
   Do not use an allow-everyone policy. Do not enable unprotected preview URLs.
5. After verifying Access is enabled for this Worker, change `workers_dev` to `true`
   on the staging branch and redeploy. Keep `preview_urls: false`. Verify an unsigned
   request cannot retrieve the app or its static assets and an allowed tester can.
6. Configure Supabase Auth Site URL and permitted redirects for the verified staging
   hostname if required by the chosen login flow. Do not change production Auth.
7. Record the actual Worker URL, deployment/version ID, commit SHA and access-test
   results. No paid upgrade, production route or real customer data is authorized.

## Acceptance checks

Use synthetic records and staging-only test accounts. Local automated checks cover
pricing, intake validation, CSV safety, auth lifecycle and a PostgreSQL workflow/RLS
simulation. They do **not** establish successful hosted browser operation.

- Allowed tester passes Access; unauthorized visitor is blocked, including assets.
- Staff login succeeds; invalid login fails without exposing records.
- Customer intake validates required fields and saves synthetic customer/device data.
- Inspection and quotation follow the existing 30%/50%/manual pricing rules.
- Approval, quote sharing state, customer decision and service/dispatch transitions
  enforce roles and persist after refresh. Do not send external messages.
- Reports export the intended synthetic records, with safe CSV values.
- Logout clears records and prevents access after reload; restricted users cannot
  call privileged operations.

Official references:
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/platform/limits/
