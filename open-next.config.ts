import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Keep staging infrastructure isolated; no R2 cache binding is required for the
// initial smoke test. Revisit caching before running customer-facing production.
export default defineCloudflareConfig();
