import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
test('auth callback defers loading, preventing auth-lock reentrancy', () => {
  const callback = page.match(/onAuthStateChange\([\s\S]*?data\.subscription\.unsubscribe\(\)/)?.[0];
  assert.ok(callback, 'Expected callback and subscription cleanup');
  assert.match(callback, /setTimeout\(\(\)=>\{pending\.delete\(timer\);if\(active\)void load\(c\)\},0\)/);
  assert.doesNotMatch(callback, /onAuthStateChange\(async/);
});
test('sign-out clears previous account business records from component state', () => {
  const clearing = page.match(/function clearWorkspace\(\)\{[^}]+\}/)?.[0];
  assert.ok(clearing);
  for(const value of ['setSession(false)','setStaff(null)','setCustomers([])','setJobs([])','setQuotes([])']) assert.ok(clearing.includes(value));
  assert.match(page, /if\(!session\)\{for\(const timer of pending\)clearTimeout\(timer\);pending\.clear\(\);clearWorkspace\(\);return\}/);
});
test('late account loading cannot repopulate records after signout or account switch', () => {
  assert.match(page, /const version=\+\+loadVersion\.current/);
  assert.ok((page.match(/if\(version!==loadVersion\.current\)return/g)||[]).length>=2);
  assert.match(page, /function clearWorkspace\(\)\{loadVersion\.current\+\+/);
});
