import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import config from '../next.config.mjs';

test('hides framework identifying header', () => {
  assert.equal(config.poweredByHeader, false);
});
test('protective headers are applied to all pages', async () => {
  const rules=await config.headers();
  assert.equal(rules[0].source,'/:path*');
  const headers=Object.fromEntries(rules[0].headers.map(({key,value})=>[key,value]));
  assert.equal(headers['X-Frame-Options'],'DENY');
  assert.equal(headers['X-Content-Type-Options'],'nosniff');
  assert.match(headers['Permissions-Policy'],/camera=\(\)/);
});
test('no real environment secret file is bundled into source', () => {
  assert.equal(existsSync(new URL('../.env.local',import.meta.url)),false);
  const ignore=readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
  assert.match(ignore,/\.env/);
});
