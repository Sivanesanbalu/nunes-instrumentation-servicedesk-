import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

// Local PostgreSQL semantics only: auth.uid is simulated; no hosted Auth/PostgREST.
test('SQL migrations, RLS, pricing, approval, sharing and complete delivery lifecycle', async () => {
 const db=new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;
 grant execute on function auth.uid() to authenticated,anon;`);
 for(const name of ['schema.sql','phase2.sql','phase5_quotation_uniqueness.sql']) {
 // gen_random_uuid is built in; pgcrypto packaging is not exercised by PGlite.
 const sql=readFileSync(new URL('../supabase/'+name,import.meta.url),'utf8').replace('create extension if not exists pgcrypto;','');
 await db.exec(sql);
 }
 const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002',inactive='00000000-0000-4000-8000-000000000003';
 for(const id of [owner,manager,inactive]) await db.query('insert into auth.users(id,email) values($1,$2)',[id,'synthetic@example.invalid']);
 await db.query("update public.staff set role='owner',active=true where id=$1",[owner]);
 await db.query("update public.staff set role='coordinator',active=true where id=$1",[manager]);
 async function login(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 await login(manager);
 const customer=(await db.query("insert into customers(company_name,contact_person,phone,created_by) values('SYNTHETIC TEST ONLY','Test Fixture','+919000000000',auth.uid()) returning id")).rows[0].id;
 const jobInsert="insert into service_jobs(customer_id,intake_channel,product,problem,original_price_paise,effort,created_by) values($1,'walk_in','Synthetic meter','Synthetic fault',2000000,$2,auth.uid()) returning id";
 await assert.rejects(db.query("insert into service_jobs(customer_id,intake_channel,product,problem,original_price_paise,status,created_by) values($1,'walk_in','Test','Test',0,'closed',auth.uid())",[customer]),/row-level security/);
 for(const effort of [29,30,50,51]){
 const job=(await db.query(jobInsert,[customer,effort])).rows[0].id;
 await assert.rejects(db.query("select advance_service_job($1,'delivered','')",[job]),/Invalid transition/);
 await assert.rejects(db.query("select record_service_inspection($1,null)",[job]),/Effort/);
 await db.query("select record_service_inspection($1,$2)",[job,effort]);
 await db.query("select advance_service_job($1,'under_inspection','test')",[job]);
 await db.query("select advance_service_job($1,'awaiting_quotation','test')",[job]);
 const quote=(await db.query('select create_service_quote($1,100000) as id',[job])).rows[0].id;
 const q=(await db.query('select * from service_quotes where id=$1',[quote])).rows[0];
 assert.equal(Number(q.labor_paise),effort>50?1000000:100000);
 assert.equal(Number(q.total_paise),effort>50?1180000:118000);
 await assert.rejects(db.query('select create_service_quote($1,100000)',[job]),/active quotation/);
 if(effort>50){
 assert.equal(q.status,'pending_approval');
 await assert.rejects(db.query("select mark_service_quote_shared($1,'in_person')",[quote]),/not ready/);
 await assert.rejects(db.query('select approve_service_quote($1)',[quote]),/Owner only/);
 await login(owner);await db.query('select approve_service_quote($1)',[quote]);await login(manager);
 }
 await assert.rejects(db.query('select mark_service_quote_shared($1,null)',[quote]),/Invalid channel/);
 await db.query("select mark_service_quote_shared($1,'in_person')",[quote]);
 await assert.rejects(db.query("select decide_service_quote($1,null,'synthetic decision')",[quote]),/decision required/);
 await db.query("select decide_service_quote($1,true,'synthetic acceptance')",[quote]);
 for(const state of ['repair_in_progress','qa_testing','ready_for_delivery','dispatched','delivered','closed'])await db.query('select advance_service_job($1,$2,\'synthetic evidence\')',[job,state]);
 const delivered=(await db.query('select status,delivered_at from service_jobs where id=$1',[job])).rows[0];
 assert.equal(delivered.status,'closed');assert.ok(delivered.delivered_at);
 assert.ok((await db.query('select id from service_events where job_id=$1',[job])).rows.length>=10);
 }
 await assert.rejects(db.query("update staff set role='owner' where id=auth.uid()"),/permission denied/);
 await login(inactive);assert.equal((await db.query('select * from customers')).rows.length,0);
 await assert.rejects(db.query(jobInsert,[customer,30]),/row-level security/);
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query('select * from customers'),/permission denied/);
 await assert.rejects(db.query('select approve_service_quote(gen_random_uuid())'),/permission denied/);
 } finally {await db.close()}
});
