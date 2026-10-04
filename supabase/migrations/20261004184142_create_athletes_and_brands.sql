-- Public athlete and brand profiles, filled in during onboarding. A row exists once the user
-- has finished onboarding.
--
-- Everything in athletes and brands is public, guests included. Data only the owner may see
-- (for now the athlete's last name; later contact details, shared with collaborations) lives
-- in athlete_private.

-- Same ids as in src/lib/sports.ts. Add new sports with `alter type ... add value`.
create type public.sport as enum (
  'triathlon', 'hyrox', 'ocr',
  'fitness', 'parkour', 'climbing',
  'mtb', 'bmx', 'skateboard', 'motorsport',
  'snowboard', 'freeski',
  'surf', 'kitesurf', 'wakeboard', 'kayak'
);

-- Single-line text with no leading or trailing whitespace, and never blank. The app trims
-- input before saving; this stops untrimmed or whitespace-only values written any other way.
create domain public.trimmed_text as text
  check (value ~ '^\S(.*\S)?$' and value !~ '[[:cntrl:]]');

-- Lets athletes and brands reference (id, account_type), so an athlete row can only belong to
-- an athlete account and a brand row only to a brand account.
alter table public.profiles add constraint profiles_id_account_type_key unique (id, account_type);

create table public.athletes (
  id uuid primary key,
  account_type public.account_type not null default 'athlete' check (account_type = 'athlete'),
  first_name public.trimmed_text not null check (char_length(first_name) <= 100),
  nickname public.trimmed_text not null check (char_length(nickname) <= 50),
  -- The year, not the date: enough to show an age, and less personal data. The real age range
  -- depends on today's date, so the app checks it; this only stops absurd values.
  birth_year smallint not null check (birth_year between 1900 and 2100),
  city public.trimmed_text not null check (char_length(city) <= 100),
  sports public.sport[] not null
    check (cardinality(sports) between 1 and 16 and array_position(sports, null) is null),
  created_at timestamptz not null default now(),
  foreign key (id, account_type) references public.profiles (id, account_type) on delete cascade
);

create table public.athlete_private (
  id uuid primary key references public.athletes (id) on delete cascade,
  last_name public.trimmed_text not null check (char_length(last_name) <= 100)
);

create table public.brands (
  id uuid primary key,
  account_type public.account_type not null default 'brand' check (account_type = 'brand'),
  name public.trimmed_text not null check (char_length(name) <= 100),
  sports public.sport[] not null
    check (cardinality(sports) between 1 and 16 and array_position(sports, null) is null),
  created_at timestamptz not null default now(),
  foreign key (id, account_type) references public.profiles (id, account_type) on delete cascade
);

-- The athlete catalogue and campaign matching filter by sport (`sports @> array[...]`).
create index athletes_sports_idx on public.athletes using gin (sports);
create index brands_sports_idx on public.brands using gin (sports);

alter table public.athletes enable row level security;
alter table public.athlete_private enable row level security;
alter table public.brands enable row level security;

-- Grants: everyone reads the public profiles; owners write only the columns they fill in.
-- account_type is left to its default, and the foreign key checks it.
revoke all on table public.athletes, public.athlete_private, public.brands from anon, authenticated;
grant select on table public.athletes, public.brands to anon, authenticated;
grant insert (id, first_name, nickname, birth_year, city, sports),
  update (first_name, nickname, birth_year, city, sports)
  on table public.athletes to authenticated;
grant select, insert (id, last_name), update (last_name)
  on table public.athlete_private to authenticated;
grant insert (id, name, sports), update (name, sports) on table public.brands to authenticated;

create policy "Anyone can read athlete profiles"
  on public.athletes for select to anon, authenticated
  using (true);
create policy "Athletes can create their own profile"
  on public.athletes for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Athletes can update their own profile"
  on public.athletes for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Athletes can read their own private details"
  on public.athlete_private for select to authenticated
  using ((select auth.uid()) = id);
create policy "Athletes can create their own private details"
  on public.athlete_private for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Athletes can update their own private details"
  on public.athlete_private for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Anyone can read brand profiles"
  on public.brands for select to anon, authenticated
  using (true);
create policy "Brands can create their own profile"
  on public.brands for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Brands can update their own profile"
  on public.brands for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Saves the athlete's onboarding into both tables in one transaction, so the app never leaves
-- a profile without its private details. (Owners can still insert an athletes row directly
-- through the Data API, so code reading profiles mustn't assume athlete_private exists.)
-- Runs as the caller (security invoker), so the grants and policies above still apply.
-- Saving again updates the profile. Duplicate sports are dropped, keeping the first order.
create function public.save_athlete_profile(
  p_first_name text,
  p_last_name text,
  p_nickname text,
  p_birth_year smallint,
  p_city text,
  p_sports public.sport[]
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.athletes (id, first_name, nickname, birth_year, city, sports)
  values (
    (select auth.uid()), p_first_name, p_nickname, p_birth_year, p_city,
    array(select s from unnest(p_sports) with ordinality as u (s, i) group by s order by min(i))
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    nickname = excluded.nickname,
    birth_year = excluded.birth_year,
    city = excluded.city,
    sports = excluded.sports;

  insert into public.athlete_private (id, last_name)
  values ((select auth.uid()), p_last_name)
  on conflict (id) do update set last_name = excluded.last_name;
$$;

revoke execute on function public.save_athlete_profile from public, anon;
grant execute on function public.save_athlete_profile to authenticated;

-- The brand's counterpart, so both onboardings save the same way. (A plain upsert through the
-- Data API would need UPDATE on id, which owners don't get.)
create function public.save_brand_profile(p_name text, p_sports public.sport[])
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.brands (id, name, sports)
  values (
    (select auth.uid()), p_name,
    array(select s from unnest(p_sports) with ordinality as u (s, i) group by s order by min(i))
  )
  on conflict (id) do update set
    name = excluded.name,
    sports = excluded.sports;
$$;

revoke execute on function public.save_brand_profile from public, anon;
grant execute on function public.save_brand_profile to authenticated;
