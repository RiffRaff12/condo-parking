-- ── Enums ──────────────────────────────────────────────────────
create type request_status as enum ('open', 'resolved', 'cancelled', 'expired');

-- ── Tables ─────────────────────────────────────────────────────
create table residents_directory (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  unit_number   text not null,
  bay_number    text not null,
  created_at    timestamptz not null default now()
);

create table requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid references auth.users(id),
  unit          text not null,
  name          text not null,
  phone         text not null,
  start_datetime timestamptz not null,
  end_datetime   timestamptz not null,
  status        request_status not null default 'open',
  fulfiller_id  uuid references auth.users(id),
  fulfiller_bay text,
  created_at    timestamptz not null default now()
);

create table push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id),
  subscription_json jsonb not null,
  created_at        timestamptz not null default now(),
  unique (user_id)
);

-- ── RLS ────────────────────────────────────────────────────────
alter table residents_directory  enable row level security;
alter table requests             enable row level security;
alter table push_subscriptions   enable row level security;

-- residents_directory: no client access (service role only)
-- no policies created = no authenticated user can read/write

-- requests: any authenticated user can read; only owner can insert/update/delete
create policy "requests: authenticated users can read"
  on requests for select
  to authenticated
  using (true);

create policy "requests: owner can insert"
  on requests for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "requests: owner can update"
  on requests for update
  to authenticated
  using (requester_id = auth.uid());

create policy "requests: owner can delete"
  on requests for delete
  to authenticated
  using (requester_id = auth.uid());

-- push_subscriptions: owner only
create policy "push_subscriptions: owner can read"
  on push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions: owner can insert"
  on push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_subscriptions: owner can update"
  on push_subscriptions for update
  to authenticated
  using (user_id = auth.uid());
