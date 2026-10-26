-- 0011_upcoming_reminders.sql
-- Paste into the Supabase SQL Editor and run once.
-- How many days before the rent due date Yard lists tenants to remind. 0 means off.

alter table public.landlords
  add column if not exists upcoming_reminder_days smallint not null default 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'landlords_upcoming_reminder_days_check'
  ) then
    alter table public.landlords
      add constraint landlords_upcoming_reminder_days_check
      check (upcoming_reminder_days in (0, 1, 2, 3, 5, 7));
  end if;
end $$;
