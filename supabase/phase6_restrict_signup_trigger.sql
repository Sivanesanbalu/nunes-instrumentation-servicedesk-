-- Migration applied to Nunes Instrumentation staging on 2026-10-16.
-- Only the auth.users AFTER INSERT trigger should invoke this SECURITY DEFINER function.
-- Authenticated/anonymous API clients do not need and must not receive direct EXECUTE rights.
revoke execute on function public.staff_on_signup() from authenticated, anon, public;
