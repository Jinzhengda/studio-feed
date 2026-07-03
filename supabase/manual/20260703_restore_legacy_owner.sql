begin;

do $$
declare
  target_user_id uuid;
begin
  select id
    into target_user_id
    from auth.users
    where lower(email) = lower('lee81580237@gmail.com')
    limit 1;

  if target_user_id is null then
    raise exception 'Target user was not found';
  end if;

  create schema if not exists private;
  revoke all on schema private from public, anon, authenticated;

  create table if not exists private.studios_backup_20260703
    as table public.studios with data;
  create table if not exists private.works_backup_20260703
    as table public.works with data;
  create table if not exists private.rls_policies_backup_20260703
    as
    select *
    from pg_policies
    where schemaname = 'public'
      and tablename in ('studios', 'works', 'profiles');

  alter table public.studios
    add column if not exists owner_id uuid references auth.users(id) on delete cascade,
    add column if not exists last_refreshed_at timestamptz,
    add column if not exists refresh_started_at timestamptz,
    add column if not exists refresh_error text;

  alter table public.profiles
    add column if not exists last_manual_refresh_at timestamptz;

  update public.studios
    set owner_id = target_user_id
    where owner_id is null;

  if exists (select 1 from public.studios where owner_id is null) then
    raise exception 'Some studios still have no owner';
  end if;
end
$$;

alter table public.studios alter column owner_id set not null;

create index if not exists studios_owner_created_idx
  on public.studios(owner_id, created_at desc);
create index if not exists studios_owner_active_idx
  on public.studios(owner_id, is_active);
create index if not exists works_studio_first_seen_idx
  on public.works(studio_id, first_seen_at desc);

create or replace function public.enforce_studio_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.studios where owner_id = new.owner_id) >= 50 then
    raise exception '每个账号最多添加 50 家工作室';
  end if;
  return new;
end;
$$;

drop trigger if exists studios_limit_trigger on public.studios;
create trigger studios_limit_trigger
before insert on public.studios
for each row execute function public.enforce_studio_limit();

create or replace function public.claim_manual_refresh()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  claimed boolean := false;
begin
  if current_user_id is null then return false; end if;

  update public.profiles
    set last_manual_refresh_at = now()
    where id = current_user_id
      and (
        last_manual_refresh_at is null
        or last_manual_refresh_at <= now() - interval '10 minutes'
      );
  claimed := found;

  if not claimed then
    insert into public.profiles(id, last_manual_refresh_at)
      values (current_user_id, now())
      on conflict (id) do nothing;
    claimed := found;
  end if;

  return claimed;
end;
$$;

revoke all on function public.claim_manual_refresh() from public;
grant execute on function public.claim_manual_refresh() to authenticated;

alter table public.studios enable row level security;
alter table public.works enable row level security;

drop policy if exists "auth delete studios" on public.studios;
drop policy if exists "auth update studios" on public.studios;
drop policy if exists "auth write studios" on public.studios;
drop policy if exists "public read studios" on public.studios;
drop policy if exists "studios_select_own" on public.studios;
drop policy if exists "studios_insert_own" on public.studios;
drop policy if exists "studios_update_own" on public.studios;
drop policy if exists "studios_delete_own" on public.studios;

create policy "studios_select_own" on public.studios
  for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "studios_insert_own" on public.studios
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "studios_update_own" on public.studios
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "studios_delete_own" on public.studios
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "auth delete works" on public.works;
drop policy if exists "auth update works" on public.works;
drop policy if exists "auth write works" on public.works;
drop policy if exists "public read works" on public.works;
drop policy if exists "works_select_own" on public.works;
drop policy if exists "works_insert_own" on public.works;
drop policy if exists "works_update_own" on public.works;
drop policy if exists "works_delete_own" on public.works;

create policy "works_select_own" on public.works
  for select to authenticated
  using (exists (
    select 1 from public.studios
    where studios.id = works.studio_id
      and studios.owner_id = (select auth.uid())
  ));
create policy "works_insert_own" on public.works
  for insert to authenticated
  with check (exists (
    select 1 from public.studios
    where studios.id = works.studio_id
      and studios.owner_id = (select auth.uid())
  ));
create policy "works_update_own" on public.works
  for update to authenticated
  using (exists (
    select 1 from public.studios
    where studios.id = works.studio_id
      and studios.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.studios
    where studios.id = works.studio_id
      and studios.owner_id = (select auth.uid())
  ));
create policy "works_delete_own" on public.works
  for delete to authenticated
  using (exists (
    select 1 from public.studios
    where studios.id = works.studio_id
      and studios.owner_id = (select auth.uid())
  ));

commit;

select
  count(*) as studio_count,
  count(*) filter (
    where owner_id = (
      select id from auth.users
      where lower(email) = lower('lee81580237@gmail.com')
      limit 1
    )
  ) as assigned_studio_count,
  count(*) filter (where owner_id is null) as unassigned_studio_count
from public.studios;
