-- The chat between a brand and an athlete (docs/superpowers/specs/2026-11-06-in-app-chat-design.md).
-- The chat is the application: it opens when the brand first accepts it, and from then on
-- the application never goes back to pending, so it can't be withdrawn and the chat's history
-- never disappears.

-- 1. When the application was first accepted: null for applications never accepted. Set by the
-- trigger below; no column grant, so nobody writes it through the Data API.
alter table public.applications add column accepted_at timestamptz;

-- Applications accepted before this migration count as accepted when they were created.
update public.applications set accepted_at = created_at where status = 'accepted';

create function private.track_application_acceptance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'pending' and old.accepted_at is not null then
    raise exception 'An accepted application can''t go back to pending'
      using errcode = 'check_violation';
  end if;
  if new.status = 'accepted' and old.accepted_at is null then
    new.accepted_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function private.track_application_acceptance() from public, anon, authenticated;

create trigger track_application_acceptance
  before update of status on public.applications
  for each row execute function private.track_application_acceptance();
