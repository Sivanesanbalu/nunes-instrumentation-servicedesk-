import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/prepush-safety.mjs',import.meta.url),'utf8');
test('prepush check executes successfully on current source',()=>{
 const output=JSON.parse(execFileSync(process.execPath,['scripts/prepush-safety.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 assert.equal(output.status,'PASS'); assert.ok(output.files_scanned>=30);
});
test('prepush scanner includes credential and private key patterns',()=>{
 assert.match(source,/SUPABASE_SERVICE_ROLE_KEY/);assert.match(source,/PRIVATE KEY/);assert.match(source,/node_modules/);
});
