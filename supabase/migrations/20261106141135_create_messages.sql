-- The chat's messages (docs/superpowers/specs/2026-11-06-in-app-chat-design.md). One chat per
-- application, open once the brand first accepted it (applications.accepted_at).
--
-- Who sees what (RLS):
-- - the application's athlete and its campaign's brand read the chat once it was accepted, and
--   write in it while the application is accepted (a rejection locks it);
-- - nobody else, guests included; nobody changes or deletes a message.
--
-- System entries (kind other than 'text', no sender, no body) are written only by the trigger
-- below when the brand accepts, rejects or accepts again.

create type public.message_kind as enum ('text', 'accepted', 'closed', 'reopened');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  -- Accepted applications can't go back to pending, so they can't be withdrawn, and campaigns
  -- with applications can't be deleted: a chat never loses its application.
  application_id uuid not null references public.applications (id) on delete restrict,
  kind public.message_kind not null default 'text',
  sender_id uuid references public.profiles (id) on delete cascade,
  -- Multi-line like applications.message: trimmed by the app, with at least one visible
  -- character (the same list as 20261025193452_reject_invisible_text), at most 2000.
  body text
    check (
      char_length(body) <= 2000
      and body ~ '[^\t\n\v\f\r \u0085\u00A0\u00AD\u034F\u061C\u115F\u1160\u1680\u17B4\u17B5\u180B-\u180F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFE00-\uFE0F\uFEFF\uFFA0]'
      and body = btrim(body, E' \t\n\r')
    ),
  created_at timestamptz not null default now(),
  -- Text has a sender and a body; system entries have neither.
  constraint messages_text_has_sender_and_body
    check ((kind = 'text') = (sender_id is not null and body is not null)),
  constraint messages_system_entries_are_empty
    check (kind = 'text' or (sender_id is null and body is null))
);

-- A chat's messages in order.
create index messages_application_id_created_at_idx
  on public.messages (application_id, created_at);
-- For the foreign key's cascade when a profile goes.
create index messages_sender_id_idx on public.messages (sender_id);

alter table public.messages enable row level security;

revoke all on table public.messages from anon, authenticated;
grant select on table public.messages to authenticated;
-- Not kind (always 'text' from users) nor created_at.
grant insert (application_id, sender_id, body) on table public.messages to authenticated;

-- applications' own RLS limits the subquery to the user's applications (as the athlete, or as
-- the campaign's brand).
create policy "The two sides read their chat"
  on public.messages for select to authenticated
  using (
    application_id in (select id from public.applications where accepted_at is not null)
  );

create policy "The two sides write while the application is accepted"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and application_id in (select id from public.applications where status = 'accepted')
  );

-- System entries on status changes. Runs after track_application_acceptance (a before trigger),
-- and reads old.accepted_at, the value before this update.
create function private.add_status_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.message_kind;
begin
  if new.status = 'accepted' and old.accepted_at is null then
    entry := 'accepted';
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    entry := 'reopened';
  elsif old.status = 'accepted' and new.status <> 'accepted' then
    entry := 'closed';
  else
    return null;
  end if;
  insert into public.messages (application_id, kind) values (new.id, entry);
  return null;
end;
$$;

revoke execute on function private.add_status_entry() from public, anon, authenticated;

create trigger add_status_entry
  after update of status on public.applications
  for each row execute function private.add_status_entry();
