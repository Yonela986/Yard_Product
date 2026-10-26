-- 0004_charges_and_balances.sql
-- Charges, payments (schema only for now), balances view and rent generation.

create or replace function public.today_sa()
returns date
language sql
stable
as $$
  select (now() at time zone 'Africa/Johannesburg')::date;
$$;

create or replace function public.owns_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenants t
    join public.rooms r on r.id = t.room_id
    join public.properties p on p.id = r.property_id
    where t.id = p_tenant_id and p.landlord_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_tenant(uuid) from public;
grant execute on function public.owns_tenant(uuid) to authenticated;

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type text not null check (type in ('rent', 'electricity', 'water', 'other')),
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount_cents integer not null check (amount_cents > 0),
  due_date date not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists charges_tenant_due_idx on public.charges (tenant_id, due_date);
create index if not exists charges_period_idx on public.charges (period);
-- One rent charge per tenant per period, so generation can run any number of times.
create unique index if not exists charges_one_rent_per_tenant_period
  on public.charges (tenant_id, period) where type = 'rent';

-- Payments: schema only in this phase. Recording and receipts arrive in Phase 4.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_on date not null,
  method text not null check (method in ('cash', 'eft', 'ewallet', 'other')),
  proof_url text,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'pending_confirmation', 'declined')),
  receipt_number text,
  created_by text not null default 'landlord' check (created_by in ('landlord', 'tenant')),
  created_at timestamptz not null default now()
);
create index if not exists payments_tenant_paid_on_idx on public.payments (tenant_id, paid_on);

alter table public.charges enable row level security;
alter table public.payments enable row level security;
revoke all on table public.charges, public.payments from anon;

drop policy if exists charges_select_own on public.charges;
create policy charges_select_own on public.charges
  for select to authenticated using (public.owns_tenant(tenant_id));
drop policy if exists charges_insert_own on public.charges;
create policy charges_insert_own on public.charges
  for insert to authenticated with check (public.owns_tenant(tenant_id));
drop policy if exists charges_update_own on public.charges;
create policy charges_update_own on public.charges
  for update to authenticated
  using (public.owns_tenant(tenant_id)) with check (public.owns_tenant(tenant_id));
-- No delete policy on charges or payments on purpose.

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated using (public.owns_tenant(tenant_id));
drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert to authenticated with check (public.owns_tenant(tenant_id));
drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
  for update to authenticated
  using (public.owns_tenant(tenant_id)) with check (public.owns_tenant(tenant_id));

-- Balances per tenant. security_invoker makes the view obey the caller's RLS.
create or replace view public.tenant_balances
with (security_invoker = true) as
with paid as (
  select
    p.tenant_id,
    sum(p.amount_cents) as paid_cents,
    sum(p.amount_cents) filter (
      where p.paid_on >= date_trunc('month', public.today_sa())::date
        and p.paid_on < (date_trunc('month', public.today_sa()) + interval '1 month')::date
    ) as paid_this_month_cents
  from public.payments p
  where p.status = 'confirmed'
  group by p.tenant_id
),
charged as (
  select
    c.tenant_id,
    sum(c.amount_cents) as charged_cents,
    sum(c.amount_cents) filter (where c.due_date < public.today_sa()) as due_to_date_cents
  from public.charges c
  group by c.tenant_id
),
running as (
  select
    c.tenant_id,
    c.due_date,
    sum(c.amount_cents) over (
      partition by c.tenant_id order by c.due_date, c.created_at, c.id
    ) as running_cents
  from public.charges c
)
select
  t.id as tenant_id,
  t.room_id,
  coalesce(ch.charged_cents, 0)::bigint as charged_cents,
  coalesce(pd.paid_cents, 0)::bigint as paid_cents,
  (coalesce(ch.charged_cents, 0) - coalesce(pd.paid_cents, 0))::bigint as balance_cents,
  greatest(coalesce(ch.due_to_date_cents, 0) - coalesce(pd.paid_cents, 0), 0)::bigint as overdue_cents,
  coalesce(pd.paid_this_month_cents, 0)::bigint as paid_this_month_cents,
  (
    select min(r.due_date)
    from running r
    where r.tenant_id = t.id and r.running_cents > coalesce(pd.paid_cents, 0)
  ) as oldest_unpaid_due_date
from public.tenants t
left join charged ch on ch.tenant_id = t.id
left join paid pd on pd.tenant_id = t.id;

revoke all on public.tenant_balances from anon;
grant select on public.tenant_balances to authenticated;

-- Create any missing monthly rent charges for the caller's tenants.
-- Runs as the signed-in user, so RLS limits it to their own tenants.
-- Safe to call repeatedly. Returns the number of charges created.
create or replace function public.generate_rent_charges()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_month date := date_trunc('month', public.today_sa())::date;
  v_count integer := 0;
  v_added integer;
  v_start date;
  v_end date;
  v_month date;
  r record;
begin
  for r in
    select
      t.id as tenant_id,
      t.move_in_date,
      t.move_out_date,
      t.created_at,
      rm.monthly_rent_cents,
      rm.due_day
    from public.tenants t
    join public.rooms rm on rm.id = t.room_id
  loop
    v_start := date_trunc(
      'month',
      greatest(r.move_in_date, (r.created_at at time zone 'Africa/Johannesburg')::date)
    )::date;

    if r.move_out_date is null then
      v_end := v_current_month;
    else
      v_end := least(v_current_month, date_trunc('month', r.move_out_date)::date);
    end if;

    v_month := v_start;
    while v_month <= v_end loop
      insert into public.charges (tenant_id, type, period, amount_cents, due_date)
      values (
        r.tenant_id,
        'rent',
        to_char(v_month, 'YYYY-MM'),
        r.monthly_rent_cents,
        greatest(v_month + (r.due_day - 1), r.move_in_date)
      )
      on conflict (tenant_id, period) where type = 'rent' do nothing;

      get diagnostics v_added = row_count;
      v_count := v_count + v_added;
      v_month := (v_month + interval '1 month')::date;
    end loop;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.generate_rent_charges() from public;
grant execute on function public.generate_rent_charges() to authenticated;
