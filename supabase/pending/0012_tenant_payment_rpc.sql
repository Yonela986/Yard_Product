-- 0012_tenant_payment_rpc.sql
-- Paste into the Supabase SQL Editor and run once.
-- Lets tenants send a payment notice (with optional proof) from their link
-- without the tenant-payment Edge Function.

-- Folder a tenant may upload proof into: "<landlord_id>/<tenant_id>". Null for a bad token.
create or replace function public.tenant_proof_folder(p_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.landlord_id::text || '/' || t.id::text
  from public.tenants t
  join public.rooms r on r.id = t.room_id
  join public.properties p on p.id = r.property_id
  where p_token is not null
    and char_length(p_token) >= 32
    and t.access_token = p_token
  limit 1;
$$;

revoke all on function public.tenant_proof_folder(text) from public;
grant execute on function public.tenant_proof_folder(text) to anon, authenticated;

-- True when the folder pair belongs to a real tenant of that landlord.
create or replace function public.is_tenant_proof_folder(p_landlord text, p_tenant text)
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
    where t.id::text = p_tenant
      and p.landlord_id::text = p_landlord
  );
$$;

revoke all on function public.is_tenant_proof_folder(text, text) from public;
grant execute on function public.is_tenant_proof_folder(text, text) to anon, authenticated;

-- Tenants (signed out) may add, never read or delete, proof files in a tenant folder.
drop policy if exists payment_proofs_insert_tenant on storage.objects;
create policy payment_proofs_insert_tenant on storage.objects
  for insert to anon
  with check (
    bucket_id = 'payment-proofs'
    and public.is_tenant_proof_folder(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

-- Records the notice. Returns 'ok' or an error code the app understands.
create or replace function public.submit_tenant_payment(
  p_token text,
  p_amount_cents integer,
  p_paid_on date,
  p_method text,
  p_proof_path text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_folder text;
  v_recent integer;
  v_pending integer;
begin
  v_folder := public.tenant_proof_folder(p_token);
  if v_folder is null then
    return 'invalid_link';
  end if;
  v_tenant_id := split_part(v_folder, '/', 2)::uuid;

  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > 5000000
     or p_paid_on is null or p_paid_on > public.today_sa()
     or p_paid_on < public.today_sa() - 90
     or p_method is null or p_method not in ('cash', 'eft', 'ewallet', 'other') then
    return 'invalid_input';
  end if;

  if p_proof_path is not null and (
       p_proof_path not like v_folder || '/%'
       or p_proof_path like '%..%'
       or not exists (
         select 1 from storage.objects o
         where o.bucket_id = 'payment-proofs' and o.name = p_proof_path
       )
     ) then
    return 'invalid_input';
  end if;

  select count(*) into v_recent
  from public.payments
  where tenant_id = v_tenant_id
    and created_by = 'tenant'
    and created_at > now() - interval '24 hours';
  select count(*) into v_pending
  from public.payments
  where tenant_id = v_tenant_id
    and created_by = 'tenant'
    and status = 'pending_confirmation';
  if v_recent >= 5 or v_pending >= 3 then
    return 'too_many';
  end if;

  if exists (
    select 1 from public.payments
    where tenant_id = v_tenant_id
      and created_by = 'tenant'
      and status = 'pending_confirmation'
      and amount_cents = p_amount_cents
      and paid_on = p_paid_on
  ) then
    return 'duplicate';
  end if;

  insert into public.payments (tenant_id, amount_cents, paid_on, method, proof_url, status, created_by)
  values (v_tenant_id, p_amount_cents, p_paid_on, p_method, p_proof_path, 'pending_confirmation', 'tenant');

  return 'ok';
end;
$$;

revoke all on function public.submit_tenant_payment(text, integer, date, text, text) from public;
grant execute on function public.submit_tenant_payment(text, integer, date, text, text) to anon, authenticated;
