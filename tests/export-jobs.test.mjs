import test from 'node:test';
import assert from 'node:assert/strict';
import { allJobsCsv } from '../lib/export-jobs.mjs';
const row=n=>({id:String(n),job_code:`NS-${n}`,product:'pH meter',status:'received',effort:20,original_price_paise:30000,customer_id:'c',created_at:'2026-10-16T10:00:00.000Z'});
function mock(items, breakAt = -1){
 const calls=[];
 const client={from(table){assert.equal(table,'service_jobs');return {select(){return this},order(){return this},async range(start,end){calls.push([start,end]);return start===breakAt?{error:{message:'connection lost'}}:{data:items.slice(start,end+1),count:items.length,error:null}}}}};
 return {client,calls};
}
test('exports all paginated rows, not only first page',async()=>{const {client,calls}=mock(Array.from({length:7},(_,i)=>row(i)));const csv=await allJobsCsv(client,'',3);assert.match(csv,/NS-6/);assert.equal((csv.match(/NS-/g)||[]).length,7);assert.deepEqual(calls,[[0,2],[3,5],[6,8]])});
test('does not silently produce partial CSV on remote error',async()=>{const {client}=mock(Array.from({length:7},(_,i)=>row(i)),3);await assert.rejects(allJobsCsv(client,'',3),/connection lost/)});
test('filters by IST date after retrieving all pages',async()=>{const a=row(1),b={...row(2),created_at:'2026-10-15T10:00:00.000Z'};const {client}=mock([a,b]);const csv=await allJobsCsv(client,'2026-10-16',1);assert.match(csv,/NS-1/);assert.doesNotMatch(csv,/NS-2/)});
test('rejects server-imposed silent truncation',async()=>{const client={from(){return {select(){return this},order(){return this},async range(){return {data:[row(1)],count:8,error:null}}}}};await assert.rejects(allJobsCsv(client,'',3),/truncated/) });
test('rejects missing counts instead of trusting partial exports',async()=>{const client={from(){return {select(){return this},order(){return this},async range(){return {data:[row(1)],error:null}}}}};await assert.rejects(allJobsCsv(client,'',3),/count unavailable/) });
test('rejects unsafe page sizes',async()=>{await assert.rejects(allJobsCsv(mock([]).client,'',1001),/Invalid page size/)});
