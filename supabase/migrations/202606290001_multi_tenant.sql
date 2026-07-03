-- Studio Feed multi-user migration.
-- Back up the database before running this file.
-- The legacy data backfill intentionally stops unless exactly one auth user exists.

begin;

alter table public.studios
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists last_refreshed_at timestamptz,
  add column if not exists refresh_started_at timestamptz,
  add column if not exists refresh_error text;

alter table public.profiles
  add column if not exists last_manual_refresh_at timestamptz;

do $$
declare
  auth_user_count integer;
  legacy_owner_id uuid;
begin
  select count(*), min(id)
    into auth_user_count, legacy_owner_id
    from auth.users;

  if exists (select 1 from public.studios where owner_id is null) then
    if auth_user_count <> 1 then
      raise exception
        'Legacy studios need an owner, but auth.users contains % users. Set studios.owner_id manually, then rerun.',
        auth_user_count;
    end if;

    update public.studios
      set owner_id = legacy_owner_id
      where owner_id is null;
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
alter table public.profiles enable row level security;

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
  ));
create policy "works_delete_own" on public.works
  for delete to authenticated
  using (exists (
    select 1 from public.studios
    where studios.id = works.studio_id
      and studios.owner_id = (select auth.uid())
  ));

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Avatar objects must use: <user-id>/<filename>
update storage.buckets set public = false where id = 'public2';

drop policy if exists "avatar_read_own" on storage.objects;
drop policy if exists "avatar_insert_own" on storage.objects;
drop policy if exists "avatar_update_own" on storage.objects;
drop policy if exists "avatar_delete_own" on storage.objects;

create policy "avatar_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'public2'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "avatar_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'public2'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "avatar_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'public2'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "avatar_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'public2'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "studio_cover_insert_own" on storage.objects;
drop policy if exists "studio_cover_update_own" on storage.objects;
drop policy if exists "studio_cover_delete_own" on storage.objects;

create policy "studio_cover_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'studio-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "studio_cover_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'studio-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "studio_cover_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'studio-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- Rollback notes:
-- 1. Restore the pre-migration backup if the migration was deployed and used.
-- 2. Do not simply drop owner_id after multiple users have created data.
