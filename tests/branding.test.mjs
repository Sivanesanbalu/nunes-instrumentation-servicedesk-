import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const files=['app/page.tsx','app/layout.tsx','app/quote-document.tsx','app/operations.tsx','README.md'];
test('all customer-facing screens and documentation name Nunes Instrumentation',()=>{
 for(const path of files){const data=readFileSync(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(data,/Newton Instrumentation|NEWTON INSTRUMENTATION|Newton ServiceDesk|newton-jobs-report\.csv/i,path)}
 assert.match(readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),/Nunes Instrumentation/);
 assert.match(readFileSync(new URL('../app/quote-document.tsx',import.meta.url),'utf8'),/NUNES INSTRUMENTATION/);
});
