-- Birdies & Bets: server-side guards for sync, and account deletion only through the delete-account function.
-- Run after 0001 in the Supabase SQL editor (or `supabase db push`). Safe to re-run.
--
-- 1. Newest edit wins on the server too. The app already merges last-write-wins when it pulls; this makes a write that
--    is older than the stored row a no-op, whoever sends it (an old build, a phone back from a week offline, a shared
--    round member later, the SQL console). The phone converges on its next pull. A phone clock running ahead cannot
--    claim the future either: updated_at is capped at five minutes past the server's clock.
-- 2. Deleting an account must also revoke the Sign in with Apple tokens (Apple requires it), which the delete-account
--    Edge Function does. Calling delete_my_account() directly would skip that, so signed-in users can no longer call it;
--    the function deletes through the admin API instead.

create or replace function public.keep_newest() returns trigger language plpgsql as $$
begin
  if new.updated_at > now() + interval '5 minutes' then
    new.updated_at := now() + interval '5 minutes';
  end if;
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    -- An older edit never replaces a newer one. Returning null skips this row quietly; the rest of the batch still saves.
    return null;
  end if;
  return new;
end;
$$;

-- BEFORE triggers run in name order: "<table>_00_keep_newest" runs before "<table>_synced_at", so a skipped write
-- does not touch synced_at either.
drop trigger if exists rounds_00_keep_newest on public.rounds;
create trigger rounds_00_keep_newest before insert or update on public.rounds for each row execute function public.keep_newest();
drop trigger if exists people_00_keep_newest on public.people;
create trigger people_00_keep_newest before insert or update on public.people for each row execute function public.keep_newest();
drop trigger if exists player_groups_00_keep_newest on public.player_groups;
create trigger player_groups_00_keep_newest before insert or update on public.player_groups for each row execute function public.keep_newest();
drop trigger if exists courses_00_keep_newest on public.courses;
create trigger courses_00_keep_newest before insert or update on public.courses for each row execute function public.keep_newest();
drop trigger if exists user_settings_00_keep_newest on public.user_settings;
create trigger user_settings_00_keep_newest before insert or update on public.user_settings for each row execute function public.keep_newest();

-- Account deletion goes through the delete-account Edge Function (service role), which revokes Apple tokens first.
revoke execute on function public.delete_my_account() from authenticated;
