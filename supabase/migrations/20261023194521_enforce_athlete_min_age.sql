-- Athletes must be 18 or older. The onboarding form checks it, but athletes can also write
-- birth_year through the Data API (save_athlete_profile, or the column grant on athletes), so
-- the database checks it too.
--
-- Only the birth year is stored, so "18 or older" means turning 18 this year at the latest:
-- birth_year <= this year - 18, in UTC like the app (src/lib/onboarding/validation.ts). A CHECK
-- constraint can't depend on today's date, hence a trigger. Ages only grow, so a saved row
-- never becomes invalid later.

create function private.check_athlete_min_age()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.birth_year > extract(year from (now() at time zone 'utc'))::int - 18 then
    raise exception 'Athletes must be 18 or older'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_athlete_min_age() from public, anon, authenticated;

create trigger check_athlete_min_age
  before insert or update of birth_year on public.athletes
  for each row execute function private.check_athlete_min_age();
