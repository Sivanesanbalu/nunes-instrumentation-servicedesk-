import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStagingConfig, checkStaging } from '../scripts/staging-smoke.mjs';
const env = {NEXT_PUBLIC_SUPABASE_URL:'https://staging-project.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-key-with-sufficient-length'};
test('staging smoke fails closed without credentials', () => assert.throws(()=>validateStagingConfig({}),/Missing/));
test('staging smoke rejects unsafe URL and placeholders', () => {
  assert.throws(()=>validateStagingConfig({...env,NEXT_PUBLIC_SUPABASE_URL:'http://staging-project.supabase.co'}),/HTTPS/);
  assert.throws(()=>validateStagingConfig({...env,NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'}),/real staging/);
});
test('staging check does not query customer data or record auth token in output', async () => {
  let request;
  const result = await checkStaging(env, async (url, options) => { request={url,options}; return {ok:true,status:200}; });
  assert.equal(request.url,'https://staging-project.supabase.co/auth/v1/settings');
  assert.equal(request.options.headers.apikey,env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  assert.equal(JSON.stringify(result).includes(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),false);
});
test('staging smoke reports an authentication endpoint error', async () => {
  await assert.rejects(checkStaging(env,async()=>({ok:false,status:403})),/HTTP 403/);
});
