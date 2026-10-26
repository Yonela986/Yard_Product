-- Allow a tenant to view a safe summary using their private access token.
-- The underlying tenants, rooms, and properties tables remain unavailable to anon.
create unique index if not exists tenants_one_current_per_room
  on public.tenants (room_id)
  where move_out_date is null;

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
  where t.access_token = p_access_token
  limit 1;
$$;

revoke all on function public.get_tenant_page(text) from public;
grant execute on function public.get_tenant_page(text) to anon, authenticated;
