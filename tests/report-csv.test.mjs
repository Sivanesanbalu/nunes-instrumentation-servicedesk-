import test from 'node:test';
import assert from 'node:assert/strict';
import {safeCsvCell,jobsCsv} from '../lib/report-csv.mjs';

test('quotes commas, newlines, and double-quotes', () => {
 assert.equal(safeCsvCell('P, "meter"\nrevision'), '"P, ""meter""\nrevision"');
});
test('neutralizes common spreadsheet formula injection prefixes', () => {
 for(const prefix of ['=', '+', '-', '@', ' \t=', '\r\n@']) {
  assert.equal(safeCsvCell(prefix+'HYPERLINK("example")').startsWith('"\''),true,prefix);
 }
});
test('retains plain text without alterations', () => {
 assert.equal(safeCsvCell('pH meter'), '"pH meter"');
 assert.equal(safeCsvCell(null), '""');
});
test('generates UTF-8 BOM and currency amounts in rupees', () => {
 const csv=jobsCsv([{job_code:'NS-1',product:'pH meter',status:'received',created_at:'2026-10-16',original_price_paise:255050}]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes('"2550.50"'));
 assert.ok(csv.endsWith('\r\n'));
});
