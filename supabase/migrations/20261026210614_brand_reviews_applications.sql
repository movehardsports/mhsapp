-- Brands review the applications to their campaigns: accept or reject, reversibly. Only the
-- campaign's brand can change an application's status, and only the status column (no other
-- column has an update grant). Athletes and other brands can't: the policy matches none of
-- their rows. Any of the three statuses is allowed, so a decision can be changed later.

grant update (status) on table public.applications to authenticated;

create policy "Brands set the status of applications to their campaigns"
  on public.applications for update to authenticated
  using (
    campaign_id in (select id from public.campaigns where brand_id = (select auth.uid()))
  )
  with check (
    campaign_id in (select id from public.campaigns where brand_id = (select auth.uid()))
  );
