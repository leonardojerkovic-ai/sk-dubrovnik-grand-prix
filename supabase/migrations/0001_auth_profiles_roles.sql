-- Dubrovnik Grand Prix
-- Phase 1.2: Auth profiles, roles and RLS foundation
-- Review this migration before running it in Supabase SQL Editor.

create type public.app_role as enum ('PLAYER', 'ADMIN', 'SUPER_ADMIN');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.app_role not null default 'PLAYER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'SUPER_ADMIN'
  );
$$;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Super admins can change roles"
on public.profiles
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- The first administrator is promoted explicitly after the migration.
-- Replace the UUID below with the Auth user's UUID from Authentication > Users.
-- update public.profiles
-- set role = 'SUPER_ADMIN'
-- where id = 'YOUR-AUTH-USER-UUID';
