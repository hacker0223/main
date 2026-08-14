-- Migration: add the "generated" simulator mode (fictional market runs).
--
-- Run this in Supabase -> SQL Editor -> New query -> Run. Safe to re-run:
-- every statement is guarded.
--
-- Why a seed column instead of storing the whole generated world: the world
-- (20 fictional companies, their 7-day price paths, and every news event) is
-- derived deterministically from this single integer on the server. Storing
-- the seed alone means the server can always recompute the exact same world,
-- there's nothing for a client to tamper with, and a run costs one number
-- instead of hundreds of rows.

-- 1. Allow 'generated' alongside the existing modes.
alter table simulator_runs drop constraint if exists simulator_runs_mode_check;
alter table simulator_runs add constraint simulator_runs_mode_check
  check (mode in ('single', 'portfolio', 'generated'));

-- 2. The world seed. Null for real-market runs, set for generated ones.
--    integer, not bigint, on purpose: seeds are capped at 2^31-1 so they fit
--    exactly, and bigint is the type PostgREST may hand back as a *string*
--    to protect precision — which would quietly turn seed arithmetic into
--    string coercion on the server.
alter table simulator_runs add column if not exists seed integer;

-- 3. The Hall of Fame reads "best completed run per user, per mode" — this
--    index matches that access pattern directly.
create index if not exists simulator_runs_hall_of_fame_idx
  on simulator_runs (mode, status, return_pct desc);
