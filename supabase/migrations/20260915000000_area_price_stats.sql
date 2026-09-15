create table if not exists area_price_stats (
  id bigint generated always as identity primary key,
  city text not null,
  neighborhood text not null default '',
  avg_price_per_sqm numeric not null,
  updated_at timestamptz not null default now(),
  unique (city, neighborhood)
);

-- RLS enabled with no policies: only the service role (used by the
-- clever-worker edge function) can read/write this table.
alter table area_price_stats enable row level security;
