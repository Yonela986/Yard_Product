-- 0001_core_tables.sql
-- Landlords, properties, rooms, ownership helpers, RLS and the onboarding function.

create table if not exists public.landlords (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  phone text not null,
  language text not null default 'en' check (language in ('en', 'zu', 'xh', 'st')),
  reminder_tone text not null default 'friendly' check (reminder_tone in ('friendly', 'firm')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists landlords_phone_key on public.landlords (phone);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.landlords (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  address text,
  bank_details text,
  created_at timestamptz not null default now()
);
create index if not exists properties_landlord_id_idx on public.properties (landlord_id);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  monthly_rent_cents integer not null check (monthly_rent_cents > 0),
  due_day smallint not null default 1 check (due_day between 1 and 28),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists rooms_property_id_idx on public.rooms (property_id);

-- Ownership helpers. Every later table's policies must reuse these.
create or replace function public.owns_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property_id and p.landlord_id = (select auth.uid())
  );
$$;

create or replace function public.owns_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms r
    join public.properties p on p.id = r.property_id
    where r.id = p_room_id and p.landlord_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_property(uuid) from public;
revoke all on function public.owns_room(uuid) from public;
grant execute on function public.owns_property(uuid) to authenticated;
grant execute on function public.owns_room(uuid) to authenticated;

-- Row Level Security
alter table public.landlords enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;

revoke all on table public.landlords, public.properties, public.rooms from anon;

drop policy if exists landlords_select_own on public.landlords;
create policy landlords_select_own on public.landlords
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists landlords_insert_own on public.landlords;
create policy landlords_insert_own on public.landlords
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists landlords_update_own on public.landlords;
create policy landlords_update_own on public.landlords
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists properties_select_own on public.properties;
create policy properties_select_own on public.properties
  for select to authenticated using (landlord_id = (select auth.uid()));
drop policy if exists properties_insert_own on public.properties;
create policy properties_insert_own on public.properties
  for insert to authenticated with check (landlord_id = (select auth.uid()));
drop policy if exists properties_update_own on public.properties;
create policy properties_update_own on public.properties
  for update to authenticated
  using (landlord_id = (select auth.uid())) with check (landlord_id = (select auth.uid()));

drop policy if exists rooms_select_own on public.rooms;
create policy rooms_select_own on public.rooms
  for select to authenticated using (public.owns_property(property_id));
drop policy if exists rooms_insert_own on public.rooms;
create policy rooms_insert_own on public.rooms
  for insert to authenticated with check (public.owns_property(property_id));
drop policy if exists rooms_update_own on public.rooms;
create policy rooms_update_own on public.rooms
  for update to authenticated
  using (public.owns_property(property_id)) with check (public.owns_property(property_id));
-- No delete policies on purpose: rooms are deactivated, not deleted.

-- Onboarding: one atomic call that creates the landlord, property and rooms.
-- Runs as the signed-in user, so RLS still applies.
create or replace function public.complete_onboarding(
  p_name text,
  p_language text,
  p_property_name text,
  p_address text,
  p_rooms jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text := '+' || regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g');
  v_property_id uuid;
  v_room jsonb;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  if v_phone = '+' then
    raise exception 'No phone number on this session';
  end if;
  if exists (
    select 1 from public.landlords
    where id = v_uid and onboarding_completed_at is not null
  ) then
    raise exception 'Onboarding already completed';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0
     or char_length(trim(coalesce(p_property_name, ''))) = 0 then
    raise exception 'Name and property name are required';
  end if;
  if jsonb_typeof(p_rooms) is distinct from 'array'
     or jsonb_array_length(p_rooms) not between 1 and 50 then
    raise exception 'Between 1 and 50 rooms are required';
  end if;

  insert into public.landlords (id, name, phone, language, onboarding_completed_at)
  values (v_uid, trim(p_name), v_phone, p_language, now())
  on conflict (id) do update
    set name = excluded.name,
        language = excluded.language,
        onboarding_completed_at = excluded.onboarding_completed_at;

  insert into public.properties (landlord_id, name, address)
  values (v_uid, trim(p_property_name), nullif(trim(coalesce(p_address, '')), ''))
  returning id into v_property_id;

  for v_room in select * from jsonb_array_elements(p_rooms) loop
    insert into public.rooms (property_id, name, monthly_rent_cents, due_day)
    values (
      v_property_id,
      trim(v_room ->> 'name'),
      (v_room ->> 'monthly_rent_cents')::integer,
      coalesce((v_room ->> 'due_day')::smallint, 1)
    );
  end loop;

  return v_property_id;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, text, jsonb) from public;
grant execute on function public.complete_onboarding(text, text, text, text, jsonb) to authenticated;
