-- One profile per auth user, holding the account type chosen at sign-up.
--
-- The account type is copied from the sign-up metadata once, when the user is created.
-- Users can edit their user_metadata later, but that never reaches this table: they have
-- no write access to it. Read the account type from here, never from user_metadata.
--
-- Every insert into auth.users must carry account_type in its user metadata, or it fails
-- with a generic "Database error saving new user". That includes Studio's "Add user",
-- auth.admin.createUser, invites and seed users. OAuth and anonymous sign-ins can't pass it,
-- so they need their own design (e.g. a "choose your account type" step) before enabling.

create type public.account_type as enum ('athlete', 'brand');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type public.account_type not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users read their own profile. There are no insert, update or delete policies or grants:
-- profiles are created by the trigger below and removed with the auth user.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- The trigger function lives in a schema that isn't exposed to the Data API.
create schema if not exists private;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_type text := new.raw_user_meta_data ->> 'account_type';
begin
  if requested_type is null
    or not requested_type = any (enum_range(null::public.account_type)::text[]) then
    raise exception 'Sign-up requires a valid account_type in user metadata'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, account_type)
  values (new.id, requested_type::public.account_type);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
