-- 0002_tenants.sql
-- Tenants, tenant access links, and trigger guards.

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  phone text not null,
  language text not null default 'en' check (language in ('en', 'zu', 'xh', 'st')),
  move_in_date date not null,
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  move_out_date date,
  access_token text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists tenants_room_id_idx on public.tenants (room_id);
create index if not exists tenants_move_out_date_idx on public.tenants (move_out_date);
create unique index if not exists tenants_access_token_key on public.tenants (access_token);

alter table public.tenants enable row level security;
revoke all on table public.tenants from anon;

-- A landloard sees only tenants from their property.
drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own on public.tenants
  for select to authenticated using (public.owns_room(room_id));
drop policy if exists tenants_insert_own on public.tenants;
create policy tenants_insert_own on public.tenants
  for insert to authenticated with check (public.owns_room(room_id));
drop policy if exists tenants_update_own on public.tenants;
create policy tenants_update_own on public.tenants
  for update to authenticated using (public.owns_room(room_id)) with check (public.owns_room(room_id));
-- Tenant rows are not deleted; they move out by setting move_out_date.

-- A room with a current tenant cannot be deactivated.
create or replace function public.prevent_deactivating_occupied_room()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_active = false and old.is_active = true and exists (
    select 1 from public.tenants t
    where t.room_id = new.id and t.move_out_date is null
  ) then
    raise exception 'Room has a current tenant';
  end if;
  return new;
end;
$$;

drop trigger if exists rooms_prevent_deactivating_occupied on public.rooms;
create trigger rooms_prevent_deactivating_occupied
  before update of is_active on public.rooms
  for each row execute function public.prevent_deactivating_occupied_room();

-- A current tenant can only be placed in an active room.
create or replace function public.require_active_room_for_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.move_out_date is null and not exists (
    select 1 from public.rooms r where r.id = new.room_id and r.is_active
  ) then
    raise exception 'Room is not active';
  end if;
  return new;
end;
$$;

drop trigger if exists tenants_require_active_room on public.tenants;
create trigger tenants_require_active_room
  before insert or update of room_id, move_out_date on public.tenants
  for each row execute function public.require_active_room_for_tenant();

-- Replace a tenant's link token. Runs as the signed-in user, so RLS applies.
create or replace function public.regenerate_tenant_token(p_tenant_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  update public.tenants
  set access_token = v_token
  where id = p_tenant_id
  returning access_token into v_token;

  if not found then
    raise exception 'Tenant not found';
  end if;
  return v_token;
end;
$$;

revoke all on function public.regenerate_tenant_token(uuid) from public;
grant execute on function public.regenerate_tenant_token(uuid) to authenticated;
