import test from 'node:test';
import assert from 'node:assert/strict';
import {indiaDay,createdOnIndiaDay} from '../lib/india-date.mjs';
test('UTC evening rolls over to next date in IST',()=> assert.equal(indiaDay('2026-10-16T19:00:00Z'),'2026-10-17'));
test('UTC night earlier than IST midnight keeps day',()=> assert.equal(indiaDay('2026-10-16T18:29:59Z'),'2026-10-16'));
test('date-only filter respects IST boundaries',()=>{
 assert.equal(createdOnIndiaDay('2026-10-16T19:00:00Z','2026-10-17'),true);
 assert.equal(createdOnIndiaDay('2026-10-16T19:00:00Z','2026-10-16'),false);
 assert.equal(createdOnIndiaDay('2026-10-16T19:00:00Z',''),true);
});
test('invalid timestamps fail instead of silently misgrouping',()=>assert.throws(()=>indiaDay('not-a-timestamp'),RangeError));
