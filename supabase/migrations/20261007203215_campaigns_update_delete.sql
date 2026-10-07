-- Brands edit and delete their own campaigns. Deleting removes the row for good: there are no
-- applications yet, so nothing else depends on it. Revisit (e.g. closing instead) once there are.

-- Every column the form edits, but not brand_id: a campaign can't move to another brand.
grant update (type, title, description, sports, deadline)
  on table public.campaigns to authenticated;
grant delete on table public.campaigns to authenticated;

-- Update also needs to read the row, which "Anyone can read campaigns" allows.
create policy "Brands can update their own campaigns"
  on public.campaigns for update to authenticated
  using ((select auth.uid()) = brand_id)
  with check ((select auth.uid()) = brand_id);

create policy "Brands can delete their own campaigns"
  on public.campaigns for delete to authenticated
  using ((select auth.uid()) = brand_id);
