-- Payments: voiding, receipt numbers, immutability, and the proof storage bucket.

alter table public.payments add column if not exists voided_at timestamptz;
alter table public.payments add column if not exists void_reason text;

-- Per-landlord receipt counter. Only the trigger below writes to it.
create table if not exists public.receipt_counters (
  landlord_id uuid primary key references public.landlords (id) on delete cascade,
  last_number integer not null default 0
);
alter table public.receipt_counters enable row level security;
revoke all on table public.receipt_counters from anon;
revoke insert, update, delete on table public.receipt_counters from authenticated;

drop policy if exists receipt_counters_select_own on public.receipt_counters;
create policy receipt_counters_select_own on public.receipt_counters
  for select to authenticated using (landlord_id = (select auth.uid()));

-- Confirmed payments are immutable except for being voided.
create or replace function public.protect_confirmed_payments()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'confirmed' and (
    new.tenant_id is distinct from old.tenant_id
    or new.amount_cents is distinct from old.amount_cents
    or new.paid_on is distinct from old.paid_on
    or new.method is distinct from old.method
    or new.receipt_number is distinct from old.receipt_number
  ) then
    raise exception 'Confirmed payments cannot be edited. Void the payment and record a new one.';
  end if;

  if old.status = 'confirmed' and new.status not in ('confirmed', 'declined') then
    raise exception 'A confirmed payment can only be voided';
  end if;

  if old.status = 'declined' and new.status is distinct from old.status then
    raise exception 'A voided or declined payment cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_01_protect_confirmed on public.payments;
create trigger payments_01_protect_confirmed
  before update on public.payments
  for each row execute function public.protect_confirmed_payments();

-- Assign the next receipt number when a payment becomes confirmed.
create or replace function public.assign_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_landlord uuid;
  v_number integer;
begin
  if tg_op = 'INSERT' then
    -- Never accept a client-chosen receipt number.
    new.receipt_number := null;
  elsif old.receipt_number is not null
        and new.receipt_number is distinct from old.receipt_number then
    raise exception 'Receipt number cannot be changed';
  end if;

  if new.status = 'confirmed' and new.receipt_number is null then
    select p.landlord_id
      into v_landlord
    from public.tenants t
    join public.rooms r on r.id = t.room_id
    join public.properties p on p.id = r.property_id
    where t.id = new.tenant_id;

    if v_landlord is null then
      raise exception 'Tenant not found';
    end if;

    insert into public.receipt_counters (landlord_id, last_number)
    values (v_landlord, 1)
    on conflict (landlord_id)
    do update set last_number = public.receipt_counters.last_number + 1
    returning last_number into v_number;

    new.receipt_number := 'YD-' || lpad(v_number::text, 5, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists payments_02_assign_receipt_number on public.payments;
create trigger payments_02_assign_receipt_number
  before insert or update on public.payments
  for each row execute function public.assign_receipt_number();

-- Void a confirmed payment. Runs as the signed-in user, so RLS applies.
create or replace function public.void_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required';
  end if;

  update public.payments
  set status = 'declined',
      voided_at = now(),
      void_reason = trim(p_reason)
  where id = p_payment_id
    and status = 'confirmed';

  if not found then
    raise exception 'Payment not found or already voided';
  end if;
end;
$$;

revoke all on function public.void_payment(uuid, text) from public;
grant execute on function public.void_payment(uuid, text) to authenticated;

-- Private bucket for proof-of-payment files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- A landlord can only touch files under a folder named after their own user id.
drop policy if exists payment_proofs_select_own on storage.objects;
create policy payment_proofs_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists payment_proofs_insert_own on storage.objects;
create policy payment_proofs_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists payment_proofs_delete_own on storage.objects;
create policy payment_proofs_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
