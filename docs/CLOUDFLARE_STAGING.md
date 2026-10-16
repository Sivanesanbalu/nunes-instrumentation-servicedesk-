# Cloudflare Workers staging — Nunes Instrumentation ServiceDesk

This configuration is **preparation only**. No Cloudflare site has been created or deployed by this commit.

## Platform

Existing application: Next.js 15.5.x + Supabase.
Adapter: OpenNext Cloudflare. Cloudflare's 2026 default is vinext; this project uses
OpenNext initially to avoid changing the existing Next.js runtime while migrating.
Review vinext when compatible.

## Build and deploy (after connecting Cloudflare account)

1. On a verified, clean branch install `@opennextjs/cloudflare` and `wrangler` using npm,
   and **commit the regenerated package-lock.json**. Do not deploy until npm ci,
   npm run typecheck, npm test and npm run build succeed.
2. In Cloudflare Workers, connect the existing GitHub repository and select the
   staging branch. Configure build command `npx opennextjs-cloudflare build`,
   deploy command `npx opennextjs-cloudflare deploy`. Inspect actual command
   compatibility with the installed adapter before enabling automatic deploys.
3. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY using only
   the dedicated Nunes **staging** Supabase project (build time and runtime).
   These are publishable client settings, never a service-role key.
4. Restrict access to the staging deployment (Cloudflare Access or equivalent)
   before using real data. Use **synthetic data only** and verify staff-role
   authorization end-to-end.
5. Smoke test sign-in, customer intake, inspection, the 30%/50%/manual quotation
   rules, approval, dispatch, logout, report export and restricted-user access.
6. Monitor Worker size/compatibility limits and runtime logs. Keep Vercel project
   unchanged as fallback.

Do not commit `.dev.vars`, `.env` or keys; do not create a paid Cloudflare
resource without approval.

Official docs:
https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
