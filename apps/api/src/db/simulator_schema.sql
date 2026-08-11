-- Historical Simulator: run/holdings/transactions tables.
--
-- Trust model: the mobile app never writes to these tables directly. All
-- trades, fast-forwards, and valuations go through the backend API, which
-- validates the caller's Supabase JWT (so we know which user_id it really
-- is) then writes using the service-role key. RLS below only grants SELECT
-- to clients — no client-side insert/update/delete policies exist, so a
-- stolen anon key can only ever read data, never fake a leaderboard entry.

create table if not exists simulator_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('single', 'portfolio')),
  start_date date not null,
  sim_date date not null,
  initial_cash numeric not null check (initial_cash > 0),
  cash numeric not null check (cash >= 0),
  status text not null default 'active' check (status in ('active', 'completed')),
  final_value numeric,
  return_pct numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists simulator_holdings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references simulator_runs(id) on delete cascade,
  symbol text not null,
  shares numeric not null check (shares > 0),
  avg_cost numeric not null check (avg_cost >= 0),
  unique (run_id, symbol)
);

create table if not exists simulator_transactions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references simulator_runs(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  shares numeric not null check (shares > 0),
  price numeric not null check (price >= 0),
  sim_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists simulator_holdings_run_id_idx on simulator_holdings (run_id);
create index if not exists simulator_transactions_run_id_idx on simulator_transactions (run_id);
create index if not exists simulator_runs_user_id_idx on simulator_runs (user_id);
create index if not exists simulator_runs_leaderboard_idx on simulator_runs (status, return_pct desc);

alter table simulator_runs enable row level security;
alter table simulator_holdings enable row level security;
alter table simulator_transactions enable row level security;

-- A user can always see their own runs (active or completed); anyone can
-- see completed runs regardless of owner (that's the leaderboard). These
-- two policies OR together, which is exactly the union we want.
create policy "Users view their own runs" on simulator_runs
  for select using (auth.uid() = user_id);

create policy "Anyone views completed runs" on simulator_runs
  for select using (status = 'completed');

create policy "Users view their own holdings" on simulator_holdings
  for select using (
    exists (select 1 from simulator_runs where simulator_runs.id = run_id and simulator_runs.user_id = auth.uid())
  );

create policy "Users view their own transactions" on simulator_transactions
  for select using (
    exists (select 1 from simulator_runs where simulator_runs.id = run_id and simulator_runs.user_id = auth.uid())
  );
