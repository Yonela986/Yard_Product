-- Message log: records when a landlord opened a message in WhatsApp.
-- It does not prove the message was sent or delivered.

create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in ('welcome', 'reminder', 'receipt')),
  payment_id uuid references public.payments (id) on delete set null,
  language text not null check (language in ('en', 'zu', 'xh', 'st')),
  created_at timestamptz not null default now(),
  check (kind <> 'receipt' or payment_id is not null)
);

create index if not exists message_log_tenant_created_idx
  on public.message_log (tenant_id, created_at desc);

alter table public.message_log enable row level security;
revoke all on table public.message_log from anon;

drop policy if exists message_log_select_own on public.message_log;
create policy message_log_select_own on public.message_log
  for select to authenticated using (public.owns_tenant(tenant_id));

drop policy if exists message_log_insert_own on public.message_log;
create policy message_log_insert_own on public.message_log
  for insert to authenticated with check (public.owns_tenant(tenant_id));
-- No update or delete policies on purpose: the log is append-only.
