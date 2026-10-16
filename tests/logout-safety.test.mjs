import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
test('logout clears sensitive UI state before network signout', () => {
  assert.match(source, /async function signout\(\)\{if\(!client\)return;clearWorkspace\(\);const r=await client\.auth\.signOut\(\)/);
});
test('logout controls share the safe signout function', () => {
  assert.equal((source.match(/onClick=\{\(\)=>void signout\(\)\}/g)||[]).length,2);
});
test('pending auth callbacks are cancelled on unmount', () => {
  assert.match(source, /for\(const timer of pending\)clearTimeout\(timer\)/);
  assert.match(source, /loadVersion\.current\+\+;data\.subscription\.unsubscribe\(\)/);
});
