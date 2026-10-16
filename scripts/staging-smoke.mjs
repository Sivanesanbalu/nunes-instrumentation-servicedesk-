/** Read-only staging reachability check; deliberately does not log in or inspect customer records. */
import { pathToFileURL } from 'node:url';

export function validateStagingConfig(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid Supabase URL'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Supabase URL must be an HTTPS origin with no credentials, query or path');
  }
  if (parsed.hostname === 'example.supabase.co' || /localhost|127\.0\.0\.1/.test(parsed.hostname)) throw new Error('Provide a real staging Supabase HTTPS endpoint');
  if (key.length < 15 || /placeholder|example|dummy/i.test(key)) throw new Error('Invalid staging anon key');
  return { origin: parsed.origin, key };
}

export async function checkStaging(env, request = fetch) {
  const { origin, key } = validateStagingConfig(env);
  const controller = new AbortController();
  const stop = setTimeout(() => controller.abort(), 10000);
  try {
    // Auth settings endpoint checks host reachability without querying business tables or sending credentials to logs.
    const response = await request(`${origin}/auth/v1/settings`, {
      headers: { apikey: key }, signal: controller.signal, redirect: 'error'
    });
    if (!response.ok) throw new Error(`Supabase auth endpoint returned HTTP ${response.status}`);
    return { status: 'reachable', endpoint: origin, note: 'Reachability only; RLS, migrations, sign-in and business flows NOT verified.' };
  } finally { clearTimeout(stop); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await checkStaging(process.env), null, 2)); }
  catch (error) { console.error(`Staging smoke check FAILED: ${error.message}`); process.exitCode = 1; }
}
