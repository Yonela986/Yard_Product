-- Tenant payment notices: decline reason, landlord confirm/decline functions,
-- and token-scoped functions giving the tenant page what it needs.

alter table public.payments add column if not exists decline_reason text;

create index if not exists payments_pending_idx
  on public.payments (tenant_id) where status = 'pending_confirmation';
create index if not exists payments_tenant_created_idx
  on public.payments (tenant_id, created_at desc);

-- Landlord confirms a waiting notice, optionally correcting amount, date and method.
-- Runs as the signed-in user, so RLS applies. The receipt number is assigned
-- by the existing trigger when the status becomes confirmed.
create or replace function public.confirm_pending_payment(
  p_payment_id uuid,
  p_amount_cents integer,
  p_paid_on date,
  p_method text
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_receipt text;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Amount must be above zero';
  end if;
  if p_paid_on is null or p_paid_on > public.today_sa() then
    raise exception 'Payment date cannot be in the future';
  end if;
  if p_method is null or p_method not in ('cash', 'eft', 'ewallet', 'other') then
    raise exception 'Invalid payment method';
  end if;

  update public.payments
  set status = 'confirmed',
      amount_cents = p_amount_cents,
      paid_on = p_paid_on,
      method = p_method
  where id = p_payment_id
    and status = 'pending_confirmation'
  returning receipt_number into v_receipt;

  if not found then
    raise exception 'Payment not found or not waiting for confirmation';
  end if;

  return v_receipt;
end;
$$;

revoke all on function public.confirm_pending_payment(uuid, integer, date, text) from public;
grant execute on function public.confirm_pending_payment(uuid, integer, date, text) to authenticated;

-- Landlord declines a waiting notice, with an optional reason the tenant can see.
create or replace function public.decline_pending_payment(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.payments
  set status = 'declined',
      decline_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_payment_id
    and status = 'pending_confirmation';

  if not found then
    raise exception 'Payment not found or not waiting for confirmation';
  end if;
end;
$$;

revoke all on function public.decline_pending_payment(uuid, text) from public;
grant execute on function public.decline_pending_payment(uuid, text) to authenticated;

-- Tenant page: how to pay and the tenant's own recent notices.
-- Callable without signing in. Returns null for an unknown or invalid token.
create or replace function public.tenant_payment_info(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant record;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;

  select
    t.id as tenant_id,
    t.name as tenant_name,
    t.language as tenant_language,
    r.name as room_name,
    p.bank_details,
    l.name as landlord_name,
    l.phone as landlord_phone
  into v_tenant
  from public.tenants t
  join public.rooms r on r.id = t.room_id
  join public.properties p on p.id = r.property_id
  join public.landlords l on l.id = p.landlord_id
  where t.access_token = p_token;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'tenant_name', v_tenant.tenant_name,
    'language', v_tenant.tenant_language,
    'room_name', v_tenant.room_name,
    'bank_details', v_tenant.bank_details,
    'landlord_name', v_tenant.landlord_name,
    'landlord_phone', v_tenant.landlord_phone,
    'submissions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'amount_cents', s.amount_cents,
          'paid_on', s.paid_on,
          'method', s.method,
          'status', s.status,
          'decline_reason', s.decline_reason,
          'created_at', s.created_at
        )
        order by s.created_at desc
      )
      from (
        select pay.amount_cents, pay.paid_on, pay.method, pay.status,
               pay.decline_reason, pay.created_at
        from public.payments pay
        where pay.tenant_id = v_tenant.tenant_id
          and pay.created_by = 'tenant'
          and (
            pay.status = 'pending_confirmation'
            or (pay.status = 'declined'
                and pay.voided_at is null
                and pay.created_at > now() - interval '30 days')
          )
        order by pay.created_at desc
        limit 10
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.tenant_payment_info(text) from public;
grant execute on function public.tenant_payment_info(text) to anon, authenticated;

-- Corrective token-length guards for the existing public tenant functions.
create or replace function public.get_tenant_page(p_access_token text)
returns table (
  tenant_name text,
  move_in_date date,
  move_out_date date,
  room_name text,
  property_name text,
  monthly_rent_cents integer,
  due_day smallint
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
    r.due_day
  from public.tenants t
  join public.rooms r on r.id = t.room_id
  join public.properties p on p.id = r.property_id
  where p_access_token is not null
    and char_length(p_access_token) >= 32
    and t.access_token = p_access_token
  limit 1;
$$;
revoke all on function public.get_tenant_page(text) from public;
grant execute on function public.get_tenant_page(text) to anon, authenticated;

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
  where p_access_token is not null
    and char_length(p_access_token) >= 32
    and t.access_token = p_access_token
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
          and previous.voided_at is null
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
      where p_access_token is not null
        and char_length(p_access_token) >= 32
        and t.access_token = p_access_token
      limit 1
    )
    and pay.status = 'confirmed'
    and pay.voided_at is null
    and pay.receipt_number is not null
  order by pay.paid_on desc, pay.created_at desc, pay.id desc;
$$;
revoke all on function public.get_tenant_receipts(text) from public;
grant execute on function public.get_tenant_receipts(text) to anon, authenticated;

-- Trigger functions are not callable as ordinary functions and need no public execute.
revoke all on function public.prevent_deactivating_occupied_room() from public;
revoke all on function public.require_active_room_for_tenant() from public;
revoke all on function public.protect_confirmed_payments() from public;
revoke all on function public.assign_receipt_number() from public;
