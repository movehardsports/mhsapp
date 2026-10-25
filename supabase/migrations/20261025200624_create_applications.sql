-- Athletes apply to campaigns with a short message; the campaign's brand reviews the
-- applications. Accepting or rejecting comes in a later migration (no update grant yet).
--
-- Who sees what (RLS):
-- - an athlete reads, creates and withdraws (deletes, while pending) their own applications;
-- - a brand reads the applications to its own campaigns;
-- - nobody else, guests included.

create type public.application_status as enum ('pending', 'accepted', 'rejected');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  -- A campaign with applications can't be deleted, so athletes' applications never vanish
  -- with it (the app hides Delete for such campaigns). This also blocks deleting a brand's
  -- account (auth.users cascades down to campaigns) while its campaigns have applications:
  -- account deletion, once there is one, has to deal with them first.
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  -- athletes rows only exist on athlete accounts that finished onboarding.
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  -- Multi-line like campaign descriptions: trimmed by the app, with at least one visible
  -- character (the same list as 20261025193452_reject_invisible_text).
  message text not null
    check (
      char_length(message) <= 1000
      and message ~ '[^\t\n\v\f\r \u0085\u00A0\u00AD\u034F\u061C\u115F\u1160\u1680\u17B4\u17B5\u180B-\u180F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFE00-\uFE0F\uFEFF\uFFA0]'
      and message = btrim(message, E' \t\n\r')
    ),
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  -- One application per athlete and campaign; withdrawing deletes it, so they can apply again.
  -- Its index also serves lookups by campaign.
  unique (campaign_id, athlete_id)
);

-- An athlete's applications, newest first.
create index applications_athlete_id_created_at_idx
  on public.applications (athlete_id, created_at desc);

alter table public.applications enable row level security;

revoke all on table public.applications from anon, authenticated;
grant select on table public.applications to authenticated;
-- Not status: new applications always start as pending.
grant insert (campaign_id, athlete_id, message) on table public.applications to authenticated;
grant delete on table public.applications to authenticated;

-- One policy rather than two permissive ones, which Postgres would both run on every read.
create policy "Applicants and the campaign's brand read applications"
  on public.applications for select to authenticated
  using (
    (select auth.uid()) = athlete_id
    -- Runs once per query, not per row, and uses campaigns_brand_id_created_at_idx.
    or campaign_id in (select id from public.campaigns where brand_id = (select auth.uid()))
  );

-- Only to open campaigns: no deadline, or one from today on (UTC, like the app).
create policy "Athletes apply to open campaigns"
  on public.applications for insert to authenticated
  with check (
    (select auth.uid()) = athlete_id
    and exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and (c.deadline is null or c.deadline >= (now() at time zone 'utc')::date)
    )
  );

create policy "Athletes withdraw their pending applications"
  on public.applications for delete to authenticated
  using ((select auth.uid()) = athlete_id and status = 'pending');
