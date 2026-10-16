import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
const base=readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');
const stage=readFileSync(new URL('../supabase/phase2.sql',import.meta.url),'utf8');
const unique=readFileSync(new URL('../supabase/phase5_quotation_uniqueness.sql',import.meta.url),'utf8');
test('all customer-bearing tables explicitly enable RLS',()=>{
 for (const t of ['staff','customers','service_jobs','service_quotes','service_events'])
  assert.match(base,new RegExp(`alter table public\\.${t} enable row level security`,'i'));
});
test('client cannot directly update service job status or quotations',()=>{
 assert.doesNotMatch(base,/create\s+policy\s+\w+\s+on\s+public\.(?:service_jobs|service_quotes)\s+for\s+update/i);
 assert.doesNotMatch(base,/create\s+policy\s+\w+\s+on\s+public\.service_quotes\s+for\s+insert/i);
});
test('security-definer workflow functions restrict anonymous execute',()=>{
 for (const f of ['advance_service_job','create_service_quote','approve_service_quote','mark_service_quote_shared','decide_service_quote','record_service_inspection']){
  assert.match(stage,new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${f}\\(`,'i'));
 }
});
test('active quote uniqueness is enforced with a PostgreSQL unique index',()=>{
 assert.match(unique,/create\s+unique\s+index/i);
 assert.match(unique,/where\s+status\s+in/i);
});
