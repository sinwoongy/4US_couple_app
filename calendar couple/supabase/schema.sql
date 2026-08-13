create extension if not exists "pgcrypto";

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  partner_one_name text,
  partner_two_name text,
  anniversary_date date,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  date date not null,
  note text,
  color text not null default '#d2644a',
  all_day boolean not null default false,
  start_time text,
  end_time text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sido text not null,
  sido_code text not null,
  sigungu text not null,
  sigungu_code text not null,
  date_from date not null,
  date_to date not null,
  places text[] not null default '{}',
  food text not null default '',
  impression text not null default '',
  rating numeric(3,1) not null default 0,
  tags text[] not null default '{}',
  created_by text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.couples replica identity full;
alter table public.events replica identity full;
alter table public.trips replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.couples;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.trips;
exception
  when duplicate_object then null;
end $$;

-- Demo-friendly open policies. Tighten these before production auth is added.
alter table public.couples enable row level security;
alter table public.events enable row level security;
alter table public.trips enable row level security;

drop policy if exists "Public couples read" on public.couples;
drop policy if exists "Public couples write" on public.couples;
drop policy if exists "Public couples update" on public.couples;
drop policy if exists "Public events read" on public.events;
drop policy if exists "Public events write" on public.events;
drop policy if exists "Public events update" on public.events;
drop policy if exists "Public events delete" on public.events;
drop policy if exists "Public trips read" on public.trips;
drop policy if exists "Public trips write" on public.trips;
drop policy if exists "Public trips update" on public.trips;
drop policy if exists "Public trips delete" on public.trips;

create policy "Public couples read" on public.couples for select using (true);
create policy "Public couples write" on public.couples for insert with check (true);
create policy "Public couples update" on public.couples for update using (true) with check (true);
create policy "Public events read" on public.events for select using (true);
create policy "Public events write" on public.events for insert with check (true);
create policy "Public events update" on public.events for update using (true) with check (true);
create policy "Public events delete" on public.events for delete using (true);
create policy "Public trips read" on public.trips for select using (true);
create policy "Public trips write" on public.trips for insert with check (true);
create policy "Public trips update" on public.trips for update using (true) with check (true);
create policy "Public trips delete" on public.trips for delete using (true);
