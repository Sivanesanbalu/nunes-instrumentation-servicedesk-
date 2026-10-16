-- Run once in a NEW Supabase project SQL editor. Do not apply blindly to an existing project.
create extension if not exists pgcrypto;
create type public.staff_role as enum ('owner','admin','coordinator','technician','viewer');
create type public.service_status as enum ('received','under_inspection','awaiting_quotation','quotation_sent','approved','rejected','repair_in_progress','qa_testing','ready_for_delivery','dispatched','delivered','closed');
create table public.staff(id uuid primary key references auth.users(id) on delete cascade, full_name text not null, role public.staff_role not null default 'viewer', active boolean not null default false, created_at timestamptz not null default now());
create table public.customers(id uuid primary key default gen_random_uuid(),company_name text not null check(length(trim(company_name))>0),contact_person text not null,phone text not null check(phone ~ '^\+91[6-9][0-9]{9}$'),email text, address text, gstin text, created_at timestamptz not null default now(),created_by uuid references auth.users(id));
create sequence public.service_job_seq;
create table public.service_jobs(id uuid primary key default gen_random_uuid(),job_code text not null unique default ('NS-'||to_char(now() at time zone 'Asia/Kolkata','YYYY')||'-'||lpad(nextval('public.service_job_seq')::text,6,'0')),customer_id uuid not null references public.customers(id),status public.service_status not null default 'received',intake_channel text not null check(intake_channel in ('walk_in','courier','pickup')),product text not null,manufacturer text,model text,serial_number text,problem text not null,original_price_paise bigint not null check(original_price_paise>=0),effort int check(effort between 0 and 100),assigned_to uuid references public.staff(id),courier_tracking text,created_at timestamptz not null default now(),delivered_at timestamptz,created_by uuid references auth.users(id));
create sequence public.service_quote_seq;
create table public.service_quotes(id uuid primary key default gen_random_uuid(),quote_code text unique not null default ('NQ-'||to_char(now() at time zone 'Asia/Kolkata','YYYY')||'-'||lpad(nextval('public.service_quote_seq')::text,6,'0')),job_id uuid not null references public.service_jobs(id),status text not null default 'draft' check(status in ('draft','pending_approval','approved_by_owner','sent','accepted','rejected')),effort int not null check(effort between 0 and 100),labor_paise bigint not null,parts_paise bigint not null,shipping_paise bigint not null,discount_paise bigint not null,tax_paise bigint not null,total_paise bigint not null, tax_bp int not null,customer_snapshot jsonb not null, product_snapshot jsonb not null, created_at timestamptz not null default now(),created_by uuid references auth.users(id));
create table public.service_events(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.service_jobs(id),actor_id uuid references auth.users(id),action text not null,notes text,created_at timestamptz not null default now());
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.staff where id=auth.uid() and active)$$;
create or replace function public.can_manage() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.staff where id=auth.uid() and active and role in ('owner','admin','coordinator'))$$;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.staff where id=auth.uid() and active and role='owner')$$;
create or replace function public.staff_on_signup() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.staff(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email,''));return new;end$$;
create trigger auth_signup_staff after insert on auth.users for each row execute function public.staff_on_signup();
alter table public.staff enable row level security;alter table public.customers enable row level security;alter table public.service_jobs enable row level security;alter table public.service_quotes enable row level security;alter table public.service_events enable row level security;
create policy staff_self_read on public.staff for select to authenticated using(id=auth.uid() or public.is_staff());
create policy customers_read on public.customers for select to authenticated using(public.is_staff());
create policy customers_write on public.customers for insert to authenticated with check(public.can_manage() and created_by=auth.uid());
create policy jobs_read on public.service_jobs for select to authenticated using(public.is_staff());
create policy jobs_write on public.service_jobs for insert to authenticated with check(public.can_manage() and created_by=auth.uid() and status='received' and delivered_at is null and assigned_to is null);
create policy quotes_read on public.service_quotes for select to authenticated using(public.is_staff());
create policy events_read on public.service_events for select to authenticated using(public.is_staff());
-- IMPORTANT: quote create/status mutation must be implemented by validated server-side RPCs.
-- No direct quote INSERT / UPDATE or job UPDATE policy is granted yet, intentionally.
-- No staff self-promotion or user_roles insert allowed: promote initial owner manually via SQL admin.

-- Grant sequence usage needed by authenticated inserts via table defaults.
grant usage on sequence public.service_job_seq to authenticated;

-- Explicit grants: do not depend on project-level default privileges.
revoke all on public.staff, public.customers, public.service_jobs, public.service_quotes, public.service_events from anon, authenticated;
grant select on public.staff, public.customers, public.service_jobs, public.service_quotes, public.service_events to authenticated;
grant insert on public.customers, public.service_jobs to authenticated;
revoke all on function public.is_staff(), public.can_manage(), public.is_owner(), public.staff_on_signup() from public, anon;
grant execute on function public.is_staff(), public.can_manage(), public.is_owner() to authenticated;
