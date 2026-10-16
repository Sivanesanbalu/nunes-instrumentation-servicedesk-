import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = name => readFileSync(new URL(`../supabase/${name}`, import.meta.url), 'utf8');
const base = read('schema.sql');
const phase2 = read('phase2.sql');
const uniqueness = read('phase5_quotation_uniqueness.sql');
for (const table of ['staff', 'customers', 'service_jobs', 'service_quotes', 'service_events']) {
  assert.match(base, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `${table} needs RLS`);
}
for (const name of ['create_service_quote','advance_service_job','approve_service_quote','mark_service_quote_shared','decide_service_quote','record_service_inspection']) {
  assert(phase2.includes(`function public.${name}`), `Missing ${name} RPC`);
}
assert.match(uniqueness, /unique\s+index/i, 'Missing concurrency uniqueness constraint');
for (const [name, sql] of [['schema.sql',base],['phase2.sql',phase2],['phase5_quotation_uniqueness.sql',uniqueness]]) {
  assert(!/\bdrop\s+(table|schema|database)\b/i.test(sql), `Destructive DDL in ${name}`);
  assert(!/\btruncate\b/i.test(sql), `Truncation in ${name}`);
}
console.log('Migration contract checks: PASS. NOTE: this does not execute SQL or test database permissions.');
