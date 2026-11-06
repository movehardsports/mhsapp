-- When each side last opened a chat, for the unread marker in the header.
--
-- A message in chat C is unread for user U when it's newer than U's last_read_at for C (or U
-- never opened C) and either another user sent it, or it's a system entry (no sender) and U is
-- the application's athlete: the brand made that change itself.
--
-- Who sees what (RLS): each user reads and writes only their own rows, and only for chats they
-- are a side of (applications' own RLS), once the chat exists.

create table public.conversation_reads (
  application_id uuid not null references public.applications (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Always the database's clock: set by the trigger below on every write.
  last_read_at timestamptz not null default now(),
  primary key (application_id, user_id)
);

-- For the foreign key's cascade when a profile goes, and a user's unread count.
create index conversation_reads_user_id_idx on public.conversation_reads (user_id);

alter table public.conversation_reads enable row level security;

revoke all on table public.conversation_reads from anon, authenticated;
grant select on table public.conversation_reads to authenticated;
-- Marking a chat read is an upsert of (application_id, user_id); PostgREST's upsert updates the
-- columns it inserts, hence the update grant on them. The policies keep both pointing at the
-- user's own chats.
grant insert (application_id, user_id) on table public.conversation_reads to authenticated;
grant update (application_id, user_id) on table public.conversation_reads to authenticated;

create policy "Users read their own read state"
  on public.conversation_reads for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users mark their own chats read"
  on public.conversation_reads for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and application_id in (select id from public.applications where accepted_at is not null)
  );

create policy "Users mark their own chats read again"
  on public.conversation_reads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and application_id in (select id from public.applications where accepted_at is not null)
  );

create function private.touch_last_read_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.last_read_at := now();
  return new;
end;
$$;

revoke execute on function private.touch_last_read_at() from public, anon, authenticated;

create trigger touch_last_read_at
  before insert or update on public.conversation_reads
  for each row execute function private.touch_last_read_at();
