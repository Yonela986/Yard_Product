-- Public tenant portal: balance/status and receipt-only payment history.
-- These token-scoped functions expose selected fields without granting anon
-- access to the underlying tenant, landlord, charge, or payment tables.

create or replace function public.get_tenant_page_v2(p_access_token text)
returns table (
  tenant_name text,
  move_in_date date,
  move_out_date date,
  room_name text,
  property_name text,
  monthly_rent_cents integer,
  due_day smallint,
  balance_cents bigint,
  overdue_cents bigint,
  paid_this_month_cents bigint,
  oldest_unpaid_due_date date,
  payment_status text,
  landlord_name text,
  landlord_phone text,
  property_address text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.name,
    t.move_in_date,
    t.move_out_date,
    r.name,
    p.name,
    r.monthly_rent_cents,
    r.due_day,
    coalesce(b.balance_cents, 0)::bigint,
    coalesce(b.overdue_cents, 0)::bigint,
    coalesce(b.paid_this_month_cents, 0)::bigint,
    b.oldest_unpaid_due_date,
    case
      when coalesce(b.balance_cents, 0) <= 0 then 'paid'
      when coalesce(b.overdue_cents, 0) > 0 then 'late'
      when coalesce(b.paid_this_month_cents, 0) > 0 then 'part_paid'
      else 'not_due'
    end,
    l.name,
    l.phone,
    p.address
  from public.tenants t
  join public.rooms r on r.id = t.room_id
  join public.properties p on p.id = r.property_id
  join public.landlords l on l.id = p.landlord_id
  left join public.tenant_balances b on b.tenant_id = t.id
  where t.access_token = p_access_token
  limit 1;
$$;

revoke all on function public.get_tenant_page_v2(text) from public;
grant execute on function public.get_tenant_page_v2(text) to anon, authenticated;

create or replace function public.get_tenant_receipts(p_access_token text)
returns table (
  paid_on date,
  created_at timestamptz,
  amount_cents integer,
  method text,
  receipt_number text,
  balance_after_cents bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pay.paid_on,
    pay.created_at,
    pay.amount_cents,
    pay.method,
    pay.receipt_number,
    (
      coalesce((
        select sum(c.amount_cents)::bigint
        from public.charges c
        where c.tenant_id = pay.tenant_id
          and c.due_date <= pay.paid_on
      ), 0)
      - coalesce((
        select sum(previous.amount_cents)::bigint
        from public.payments previous
        where previous.tenant_id = pay.tenant_id
          and previous.status = 'confirmed'
          and (
            previous.paid_on < pay.paid_on
            or (previous.paid_on = pay.paid_on and previous.id < pay.id)
          )
      ), 0)
      - pay.amount_cents
    )::bigint
  from public.payments pay
  where pay.tenant_id = (
      select t.id
      from public.tenants t
      where t.access_token = p_access_token
      limit 1
    )
    and pay.status = 'confirmed'
    and pay.receipt_number is not null
  order by pay.paid_on desc, pay.created_at desc, pay.id desc;
$$;

revoke all on function public.get_tenant_receipts(text) from public;
grant execute on function public.get_tenant_receipts(text) to anon, authenticated;
