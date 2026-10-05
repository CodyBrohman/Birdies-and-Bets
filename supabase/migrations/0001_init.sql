-- Birdies & Bets, phase 1: accounts and per-user cloud sync.
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to re-run: everything is "if not exists" / "or replace".
--
-- Model: every synced thing is one row per entity, owned by the signed-in user, holding the app's own JSON shape in
-- `data`. The app merges last-write-wins per entity by `updated_at` (when it was edited, set by the phone); a delete is
-- a tombstone (`deleted_at`) so other devices learn about it. `synced_at` is set by the server on every write, and
-- pulls ask for "synced since X", so a phone with a wrong clock can never hide a change from the others. Row-level security limits every table to its owner. Phase 2 (shared rounds) adds member
-- policies on `rounds`; nothing here needs to change for it.

-- ---------- Profiles: one per account ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  handicap_index numeric(4, 1) check (handicap_index between -10 and 54),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Synced entities ----------
create table if not exists public.rounds (
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  -- 'in-progress' for the active round, 'complete' for history. Phase 2/3 query on it.
  status text not null default 'complete' check (status in ('in-progress', 'complete')),
  data jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.people (
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.player_groups (
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.courses (
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.user_settings (
  owner uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

-- Every write stamps synced_at with the server clock.
create or replace function public.touch_synced_at() returns trigger language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

drop trigger if exists rounds_synced_at on public.rounds;
create trigger rounds_synced_at before insert or update on public.rounds for each row execute function public.touch_synced_at();
drop trigger if exists people_synced_at on public.people;
create trigger people_synced_at before insert or update on public.people for each row execute function public.touch_synced_at();
drop trigger if exists player_groups_synced_at on public.player_groups;
create trigger player_groups_synced_at before insert or update on public.player_groups for each row execute function public.touch_synced_at();
drop trigger if exists courses_synced_at on public.courses;
create trigger courses_synced_at before insert or update on public.courses for each row execute function public.touch_synced_at();
drop trigger if exists user_settings_synced_at on public.user_settings;
create trigger user_settings_synced_at before insert or update on public.user_settings for each row execute function public.touch_synced_at();

-- Pulls ask for "everything of mine synced since X".
create index if not exists rounds_owner_synced on public.rounds (owner, synced_at);
create index if not exists people_owner_synced on public.people (owner, synced_at);
create index if not exists player_groups_owner_synced on public.player_groups (owner, synced_at);
create index if not exists courses_owner_synced on public.courses (owner, synced_at);

-- ---------- Row-level security: owners only ----------
alter table public.profiles enable row level security;
alter table public.rounds enable row level security;
alter table public.people enable row level security;
alter table public.player_groups enable row level security;
alter table public.courses enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own rounds" on public.rounds;
create policy "own rounds" on public.rounds for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "own people" on public.people;
create policy "own people" on public.people for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "own groups" on public.player_groups;
create policy "own groups" on public.player_groups for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "own courses" on public.courses;
create policy "own courses" on public.courses for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings for all using (owner = auth.uid()) with check (owner = auth.uid());

-- ---------- A profile row for every new account ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 40))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Account deletion (Apple requires it in-app) ----------
-- Deleting the auth user cascades to every table above.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
