-- Campaigns that brands publish: sponsorships, event sign-ups and ambassadorships.
-- Everything in campaigns is public, guests included; contact details never live here.
-- Brands only create campaigns here; 20261007203215_campaigns_update_delete adds editing and
-- deleting. Closing comes later.

create type public.campaign_type as enum ('sponsorship', 'event', 'ambassador');

create table public.campaigns (
  -- Random rather than sequential: campaign ids will appear in public URLs.
  id uuid primary key default gen_random_uuid(),
  -- Only a brand that finished onboarding (has a brands row) can own campaigns, and brands
  -- rows only exist on brand accounts.
  brand_id uuid not null references public.brands (id) on delete cascade,
  type public.campaign_type not null,
  title public.trimmed_text not null check (char_length(title) <= 100),
  -- Multi-line, so not trimmed_text (which forbids newlines). The app trims it and normalises
  -- line endings; this stops blank or padded values written any other way.
  description text not null
    check (
      char_length(description) <= 5000
      and description ~ '\S'
      and description = btrim(description, E' \t\n\r')
    ),
  sports public.sport[] not null
    check (cardinality(sports) between 1 and 16 and array_position(sports, null) is null),
  -- Optional last day to apply. "Not in the past" depends on today's date, so the app checks it.
  deadline date,
  created_at timestamptz not null default now()
);

-- The dashboard lists a brand's campaigns newest first; this also covers the foreign key.
create index campaigns_brand_id_created_at_idx on public.campaigns (brand_id, created_at desc);
-- The campaign list for athletes will filter by sport (`sports && array[...]`).
create index campaigns_sports_idx on public.campaigns using gin (sports);

alter table public.campaigns enable row level security;

revoke all on table public.campaigns from anon, authenticated;
grant select on table public.campaigns to anon, authenticated;
grant insert (brand_id, type, title, description, sports, deadline)
  on table public.campaigns to authenticated;

create policy "Anyone can read campaigns"
  on public.campaigns for select to anon, authenticated
  using (true);

create policy "Brands can create their own campaigns"
  on public.campaigns for insert to authenticated
  with check ((select auth.uid()) = brand_id);
