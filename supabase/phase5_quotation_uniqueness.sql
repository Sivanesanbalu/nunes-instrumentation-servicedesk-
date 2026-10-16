-- Nunes ServiceDesk Phase 5 additive migration.
-- Apply only after schema.sql and phase2.sql, and after reviewing any duplicates.
-- A transactional partial unique index protects against simultaneous requests.
-- Investigate duplicates before running; this migration intentionally fails if they exist.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS service_quotes_one_active_per_job
ON public.service_quotes(job_id)
WHERE status IN ('draft','pending_approval','approved_by_owner','sent');
COMMIT;
