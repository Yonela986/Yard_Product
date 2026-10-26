-- Utility bills, meter readings, linking charges to bills, bill creation and undo,
-- and a token-scoped list of a tenant's charges for the tenant page.

create table if not exists public.utility_bills (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  type text not null check (type in ('electricity', 'water')),
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  total_cents integer not null check (total_cents > 0),
  split_method text not null check (split_method in ('equal', 'by_room', 'custom')),
  due_date date not null,
  includes_main_house boolean not null default false,
  main_house_cents integer not null default 0 check (main_house_cents >= 0),
  -- Snapshot of the shares as confirmed: [{room_id, tenant_id, amount_cents, units_milli, previous_reading, current_reading, note}]
  shares jsonb not null default '[]'::jsonb,
  note text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  check (main_house_cents <= total_cents)
);
create index if not exists utility_bills_property_created_idx
  on public.utility_bills (property_id, created_at desc);

create table if not exists public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  type text not null check (type in ('electricity', 'water')),
  reading numeric(12, 3) not null check (reading >= 0),
  read_on date not null default public.today_sa(),
  bill_id uuid references public.utility_bills (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists meter_readings_room_type_idx
  on public.meter_readings (room_id, type, read_on desc, created_at desc);

-- Link charges to the bill that created them.
alter table public.charges
  add column if not exists utility_bill_id uuid references public.utility_bills (id) on delete set null;
create index if not exists charges_utility_bill_idx on public.charges (utility_bill_id);
create unique index if not exists charges_one_per_tenant_per_bill
  on public.charges (utility_bill_id, tenant_id) where utility_bill_id is not null;

-- Row Level Security
alter table public.utility_bills enable row level security;
alter table public.meter_readings enable row level security;
revoke all on table public.utility_bills, public.meter_readings from anon;

drop policy if exists utility_bills_select_own on public.utility_bills;
create policy utility_bills_select_own on public.utility_bills
  for select to authenticated using (public.owns_property(property_id));
drop policy if exists utility_bills_insert_own on public.utility_bills;
create policy utility_bills_insert_own on public.utility_bills
  for insert to authenticated with check (public.owns_property(property_id));
drop policy if exists utility_bills_update_own on public.utility_bills;
create policy utility_bills_update_own on public.utility_bills
  for update to authenticated
  using (public.owns_property(property_id)) with check (public.owns_property(property_id));
-- No delete policy on bills: they are undone, not deleted.

drop policy if exists meter_readings_select_own on public.meter_readings;
create policy meter_readings_select_own on public.meter_readings
  for select to authenticated using (public.owns_room(room_id));
drop policy if exists meter_readings_insert_own on public.meter_readings;
create policy meter_readings_insert_own on public.meter_readings
  for insert to authenticated with check (public.owns_room(room_id));
drop policy if exists meter_readings_delete_own on public.meter_readings;
create policy meter_readings_delete_own on public.meter_readings
  for delete to authenticated using (public.owns_room(room_id));

-- Charges created by a utility bill may be deleted (by undoing the bill). Nothing else.
drop policy if exists charges_delete_utility_own on public.charges;
create policy charges_delete_utility_own on public.charges
  for delete to authenticated
  using (utility_bill_id is not null and public.owns_tenant(tenant_id));

-- Bills are immutable except for being undone.
create or replace function public.protect_utility_bills()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.property_id is distinct from old.property_id
     or new.type is distinct from old.type
     or new.period is distinct from old.period
     or new.total_cents is distinct from old.total_cents
     or new.split_method is distinct from old.split_method
     or new.due_date is distinct from old.due_date
     or new.includes_main_house is distinct from old.includes_main_house
     or new.main_house_cents is distinct from old.main_house_cents
     or new.shares is distinct from old.shares then
    raise exception 'Utility bills cannot be edited. Undo the bill and add it again.';
  end if;
  if old.voided_at is not null and new.voided_at is distinct from old.voided_at then
    raise exception 'Bill already undone';
  end if;
  return new;
end;
$$;

drop trigger if exists utility_bills_protect on public.utility_bills;
create trigger utility_bills_protect
  before update on public.utility_bills
  for each row execute function public.protect_utility_bills();

-- Create a bill, its charges and its meter readings in one step.
-- Runs as the signed-in user, so RLS applies. The app calculates the shares; this function checks they add up and belong to current tenants of the property.
create or replace function public.create_utility_bill(
  p_property_id uuid,
  p_type text,
  p_period text,
  p_total_cents integer,
  p_split_method text,
  p_due_date date,
  p_includes_main_house boolean,
  p_main_house_cents integer,
  p_shares jsonb,
  p_readings jsonb,
  p_note text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_bill_id uuid;
  v_share jsonb;
  v_reading jsonb;
  v_sum bigint := 0;
  v_amount integer;
  v_room uuid;
  v_tenant uuid;
begin
  if not public.owns_property(p_property_id) then
    raise exception 'Property not found';
  end if;
  if jsonb_typeof(p_shares) is distinct from 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'At least one room must be charged';
  end if;

  for v_share in select * from jsonb_array_elements(p_shares) loop
    v_amount := (v_share ->> 'amount_cents')::integer;
    if v_amount is null or v_amount <= 0 then
      raise exception 'Every charged room needs an amount above zero';
    end if;
    v_sum := v_sum + v_amount;
  end loop;

  if v_sum + coalesce(p_main_house_cents, 0) <> p_total_cents then
    raise exception 'Shares do not add up to the bill total';
  end if;

  insert into public.utility_bills (
    property_id, type, period, total_cents, split_method, due_date,
    includes_main_house, main_house_cents, shares, note
  )
  values (
    p_property_id, p_type, p_period, p_total_cents, p_split_method, p_due_date,
    coalesce(p_includes_main_house, false), coalesce(p_main_house_cents, 0), p_shares,
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_bill_id;

  for v_share in select * from jsonb_array_elements(p_shares) loop
    v_room := (v_share ->> 'room_id')::uuid;
    v_tenant := (v_share ->> 'tenant_id')::uuid;

    if not exists (
      select 1
      from public.tenants t
      join public.rooms r on r.id = t.room_id
      where t.id = v_tenant
        and r.id = v_room
        and r.property_id = p_property_id
        and t.move_out_date is null
    ) then
      raise exception 'Tenant is not currently in that room';
    end if;

    insert into public.charges (tenant_id, type, period, amount_cents, due_date, note, utility_bill_id)
    values (
      v_tenant, p_type, p_period, (v_share ->> 'amount_cents')::integer, p_due_date,
      nullif(trim(coalesce(v_share ->> 'note', '')), ''), v_bill_id
    );
  end loop;

  if p_readings is not null and jsonb_typeof(p_readings) = 'array' then
    for v_reading in select * from jsonb_array_elements(p_readings) loop
      v_room := (v_reading ->> 'room_id')::uuid;
      if not exists (
        select 1 from public.rooms r where r.id = v_room and r.property_id = p_property_id
      ) then
        raise exception 'Room not found';
      end if;
      insert into public.meter_readings (room_id, type, reading, bill_id)
      values (v_room, p_type, (v_reading ->> 'reading')::numeric, v_bill_id);
    end loop;
  end if;

  return v_bill_id;
end;
$$;

revoke all on function public.create_utility_bill(
  uuid, text, text, integer, text, date, boolean, integer, jsonb, jsonb, text
) from public;
grant execute on function public.create_utility_bill(
  uuid, text, text, integer, text, date, boolean, integer, jsonb, jsonb, text
) to authenticated;

-- Undo a bill within 14 days: remove its charges and readings, keep the bill as a record.
create or replace function public.void_utility_bill(p_bill_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_created timestamptz;
  v_voided timestamptz;
begin
  select created_at, voided_at into v_created, v_voided
  from public.utility_bills where id = p_bill_id;

  if not found then
    raise exception 'Bill not found';
  end if;
  if v_voided is not null then
    raise exception 'Bill already undone';
  end if;
  if v_created < now() - interval '14 days' then
    raise exception 'Bills older than 14 days cannot be undone';
  end if;

  delete from public.charges where utility_bill_id = p_bill_id;
  delete from public.meter_readings where bill_id = p_bill_id;
  update public.utility_bills set voided_at = now() where id = p_bill_id;
end;
$$;

revoke all on function public.void_utility_bill(uuid) from public;
grant execute on function public.void_utility_bill(uuid) to authenticated;

-- Tenant page: a tenant's recent charges with explanation notes.
-- Callable without signing in. Returns null for an unknown or invalid token.
create or replace function public.tenant_charges(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;

  select t.id into v_tenant_id from public.tenants t where t.access_token = p_token;
  if not found then
    return null;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'type', c.type,
        'period', c.period,
        'amount_cents', c.amount_cents,
        'due_date', c.due_date,
        'note', c.note
      )
      order by c.due_date desc, c.created_at desc
    )
    from (
      select ch.type, ch.period, ch.amount_cents, ch.due_date, ch.note, ch.created_at
      from public.charges ch
      where ch.tenant_id = v_tenant_id
      order by ch.due_date desc, ch.created_at desc
      limit 36
    ) c
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.tenant_charges(text) from public;
grant execute on function public.tenant_charges(text) to anon, authenticated;
