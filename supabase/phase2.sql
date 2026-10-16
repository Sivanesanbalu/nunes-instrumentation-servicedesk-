-- Apply after schema.sql in a NEW dedicated Supabase project. Review before execution.
-- SECURITY: No direct INSERT/UPDATE policy for quotations or job status: only validated RPCs.
create table if not exists public.service_settings (
 id boolean primary key default true check(id),
 owner_approval_threshold_paise bigint not null default 1000000 check(owner_approval_threshold_paise >= 0),
 default_tax_bp int not null default 1800 check(default_tax_bp between 0 and 10000)
);
insert into public.service_settings(id) values(true) on conflict do nothing;
alter table public.service_settings enable row level security;
create policy settings_staff_read on public.service_settings for select to authenticated using(public.is_staff());
create policy settings_owner_update on public.service_settings for update to authenticated using(public.is_owner()) with check(public.is_owner());

-- Explicitly permitted state changes, validated atomically against current state.
create or replace function public.advance_service_job(p_job_id uuid, p_status public.service_status, p_notes text default '')
returns void language plpgsql security definer set search_path=public as $$
declare j public.service_jobs; role_name public.staff_role;
begin
 select role into role_name from public.staff where id=auth.uid() and active;
 if role_name is null or role_name='viewer' then raise exception 'Not authorized'; end if;
 select * into j from public.service_jobs where id=p_job_id for update;
 if not found then raise exception 'Job not found'; end if;
 if role_name='technician' and j.assigned_to is distinct from auth.uid() then raise exception 'Technician is not assigned to this job'; end if;
 if not ((j.status='received' and p_status='under_inspection')
 or (j.status='under_inspection' and p_status='awaiting_quotation')
 or (j.status='approved' and p_status='repair_in_progress')
 or (j.status='repair_in_progress' and p_status='qa_testing')
 or (j.status='qa_testing' and p_status in ('repair_in_progress','ready_for_delivery'))
 or (j.status='rejected' and p_status='ready_for_delivery')
 or (j.status='ready_for_delivery' and p_status='dispatched')
 or (j.status='dispatched' and p_status='delivered')
 or (j.status='delivered' and p_status='closed')) then raise exception 'Invalid transition or quotation action required'; end if;
 if role_name='technician' and p_status not in ('under_inspection','awaiting_quotation','repair_in_progress','qa_testing','ready_for_delivery') then raise exception 'Only coordinator/manager may dispatch or close'; end if;
 update public.service_jobs set status=p_status,delivered_at=case when p_status='delivered' then now() else delivered_at end where id=p_job_id;
 insert into public.service_events(job_id,actor_id,action,notes) values(p_job_id,auth.uid(),p_status::text,left(coalesce(p_notes,''),2000));
end $$;
revoke all on function public.advance_service_job(uuid,public.service_status,text) from public,anon;
grant execute on function public.advance_service_job(uuid,public.service_status,text) to authenticated;

-- Compute all pricing SERVER SIDE with integer paise; client never supplies total/tax.
create or replace function public.create_service_quote(p_job_id uuid,p_manual_labor_paise bigint,p_parts_paise bigint default 0,p_shipping_paise bigint default 0,p_discount_paise bigint default 0,p_tax_bp int default 1800)
returns uuid language plpgsql security definer set search_path=public as $$
declare j public.service_jobs; c public.customers; labor bigint; taxable bigint; tax bigint; sum_total bigint; s public.service_settings; quote_id uuid;
begin
 if not public.can_manage() then raise exception 'Not authorized'; end if;
 select * into j from public.service_jobs where id=p_job_id for update;
 if not found or j.status <> 'awaiting_quotation' then raise exception 'Job must be awaiting quotation'; end if;
 if j.effort is null then raise exception 'Inspection effort is required'; end if;
 if exists(select 1 from public.service_quotes where job_id=p_job_id and status in ('pending_approval','approved_by_owner','sent','accepted')) then
   raise exception 'An active quotation already exists for this job';
 end if;
 if j.effort>50 then labor:=(j.original_price_paise+1)/2;
 else
   if p_manual_labor_paise is null then raise exception 'Manual labour required for effort <= 50'; end if;
   labor:=p_manual_labor_paise;
 end if;
 if labor<0 or p_parts_paise<0 or p_shipping_paise<0 or p_discount_paise<0 or p_tax_bp not between 0 and 10000 then raise exception 'Invalid amount/tax'; end if;
 if labor>100000000000 or p_parts_paise>100000000000 or p_shipping_paise>100000000000 then raise exception 'Amount too large'; end if;
 taxable:=labor+p_parts_paise+p_shipping_paise-p_discount_paise;
 if taxable<0 then raise exception 'Discount exceeds subtotal'; end if;
 tax:=(taxable*p_tax_bp+5000)/10000; sum_total:=taxable+tax;
 select * into s from public.service_settings where id=true;
 select * into c from public.customers where id=j.customer_id;
 insert into public.service_quotes(job_id,status,effort,labor_paise,parts_paise,shipping_paise,discount_paise,tax_paise,total_paise,tax_bp,customer_snapshot,product_snapshot,created_by)
 values(j.id,case when sum_total>=s.owner_approval_threshold_paise then 'pending_approval' else 'approved_by_owner' end,j.effort,labor,p_parts_paise,p_shipping_paise,p_discount_paise,tax,sum_total,p_tax_bp,
 jsonb_build_object('company_name',c.company_name,'contact_person',c.contact_person,'phone',c.phone,'email',c.email,'address',c.address),
 jsonb_build_object('product',j.product,'model',j.model,'serial_number',j.serial_number,'job_code',j.job_code,'original_price_paise',j.original_price_paise),auth.uid()) returning id into quote_id;
 insert into public.service_events(job_id,actor_id,action,notes) values(j.id,auth.uid(),'quote_created',quote_id::text);
 return quote_id;
end $$;
revoke all on function public.create_service_quote(uuid,bigint,bigint,bigint,bigint,int) from public,anon;
grant execute on function public.create_service_quote(uuid,bigint,bigint,bigint,bigint,int) to authenticated;

create or replace function public.approve_service_quote(p_quote_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare q public.service_quotes;
begin
 if not public.is_owner() then raise exception 'Owner only'; end if;
 select * into q from public.service_quotes where id=p_quote_id for update;
 if not found or q.status <> 'pending_approval' then raise exception 'Not awaiting owner approval'; end if;
 update public.service_quotes set status='approved_by_owner' where id=q.id;
 insert into public.service_events(job_id,actor_id,action,notes) values(q.job_id,auth.uid(),'quote_owner_approved',q.quote_code);
end $$;
revoke all on function public.approve_service_quote(uuid) from public,anon;
grant execute on function public.approve_service_quote(uuid) to authenticated;

-- Manual WhatsApp/email share confirmation, NOT an external delivery claim.
create or replace function public.mark_service_quote_shared(p_quote_id uuid,p_channel text)
returns void language plpgsql security definer set search_path=public as $$
declare q public.service_quotes; j public.service_jobs;
begin
 if not public.can_manage() then raise exception 'Not authorized'; end if;
 if p_channel is null or p_channel not in ('whatsapp_manual','email_manual','in_person') then raise exception 'Invalid channel'; end if;
 select * into q from public.service_quotes where id=p_quote_id for update;
 if not found or q.status <> 'approved_by_owner' then raise exception 'Quote not ready'; end if;
 select * into j from public.service_jobs where id=q.job_id for update;
 if j.status <> 'awaiting_quotation' then raise exception 'Job not awaiting quotation'; end if;
 update public.service_quotes set status='sent' where id=q.id;
 update public.service_jobs set status='quotation_sent' where id=q.job_id;
 insert into public.service_events(job_id,actor_id,action,notes) values(q.job_id,auth.uid(),'quote_marked_shared',q.quote_code||' via '||p_channel);
end $$;
revoke all on function public.mark_service_quote_shared(uuid,text) from public,anon;
grant execute on function public.mark_service_quote_shared(uuid,text) to authenticated;

create or replace function public.decide_service_quote(p_quote_id uuid,p_accepted boolean,p_notes text)
returns void language plpgsql security definer set search_path=public as $$
declare q public.service_quotes; j public.service_jobs;
begin
 if not public.can_manage() then raise exception 'Not authorized'; end if;
 if p_accepted is null then raise exception 'Customer decision required'; end if;
 if length(trim(coalesce(p_notes,'')))<3 then raise exception 'Decision evidence/notes required'; end if;
 select * into q from public.service_quotes where id=p_quote_id for update;
 if not found or q.status <> 'sent' then raise exception 'Quote must be sent first'; end if;
 select * into j from public.service_jobs where id=q.job_id for update;
 if j.status <> 'quotation_sent' then raise exception 'Job not at quotation stage'; end if;
 update public.service_quotes set status=case when p_accepted then 'accepted' else 'rejected' end where id=q.id;
 update public.service_jobs set status=case when p_accepted then 'approved'::public.service_status else 'rejected'::public.service_status end where id=q.job_id;
 insert into public.service_events(job_id,actor_id,action,notes) values(q.job_id,auth.uid(),case when p_accepted then 'customer_approved' else 'customer_rejected' end,left(p_notes,2000));
end $$;
revoke all on function public.decide_service_quote(uuid,boolean,text) from public,anon;
grant execute on function public.decide_service_quote(uuid,boolean,text) to authenticated;

-- Controlled inspection updates; no direct job UPDATE policy.
create or replace function public.record_service_inspection(p_job_id uuid,p_effort int,p_assigned_to uuid default null,p_notes text default '')
returns void language plpgsql security definer set search_path=public as $$
declare j public.service_jobs; s public.staff;
begin
 if not public.can_manage() then raise exception 'Only manager/coordinator can assign inspection'; end if;
 if p_effort is null or p_effort not between 0 and 100 then raise exception 'Effort must be 0-100'; end if;
 select * into j from public.service_jobs where id=p_job_id for update;
 if not found or j.status not in ('received','under_inspection') then raise exception 'Job not in inspection'; end if;
 if p_assigned_to is not null then
  select * into s from public.staff where id=p_assigned_to and active;
  if not found then raise exception 'Assigned user must be active'; end if;
 end if;
 update public.service_jobs set effort=p_effort,assigned_to=coalesce(p_assigned_to,j.assigned_to) where id=p_job_id;
 insert into public.service_events(job_id,actor_id,action,notes) values(p_job_id,auth.uid(),'inspection_recorded',left(coalesce(p_notes,''),2000));
end $$;
revoke all on function public.record_service_inspection(uuid,int,uuid,text) from public,anon;
grant execute on function public.record_service_inspection(uuid,int,uuid,text) to authenticated;
-- Operational index for owner reports
create index if not exists ix_service_jobs_status_created on public.service_jobs(status,created_at desc);
create index if not exists ix_service_events_job_created on public.service_events(job_id,created_at desc);

revoke all on public.service_settings from anon, authenticated;
grant select, update on public.service_settings to authenticated;
