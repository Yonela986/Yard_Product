-- Indexes for the date-range queries behind the income report.
create index if not exists charges_due_date_idx
  on public.charges (due_date);

create index if not exists payments_paid_on_confirmed_idx
  on public.payments (paid_on) where status = 'confirmed';
