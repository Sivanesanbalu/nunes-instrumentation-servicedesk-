# Nunes Instrumentation ServiceDesk

Internal instrumentation repair and service management application (Next.js, TypeScript, Supabase).

## Current state

This repository is under active development. The full application source has not yet been synced to GitHub; **do not deploy or use with actual customer information yet**. Database migrations, authentication, quotation handling, service lifecycle and reporting must be validated end-to-end before production use.

## Planned workflow

Customer intake → job card → inspection → quotation → owner approval where required → repair → QA → dispatch → delivery.

Security rules: customer and employee data stay private; no credentials or `.env` files belong in this public repository.
