# Migrations

Migrations live in `supabase/migrations/`, starting with `0001_core_tables.sql`.

The tenant flow uses `0002_tenants.sql` for landlord-managed tenant records and
`0003_public_tenant_page.sql` for the token-scoped tenant page lookup. `0006` extends that
page with a balance/status lookup and confirmed receipt history through token-scoped RPCs;
anonymous users still receive no direct access to tenant, landlord, charge, or payment
tables. Apply each new migration to Supabase before deploying the matching app code.

Phase 3 uses `0004_charges_and_balances.sql`. Phase 4 adds
`0005_payments_and_receipts.sql`; apply it manually in the Supabase SQL editor, then
regenerate the database types from the updated schema before deploying Phase 4.

The tenant portal payment extension is `0006_tenant_portal_payments.sql`. It adds
token-scoped RPCs for tenant balance/status and confirmed receipt history without granting
anonymous access to the underlying tables. Apply it manually before deploying the updated
tenant page.

Migration `0003_public_tenant_page.sql` was created by the platform and must not be edited
or reused. Migration `0006_tenant_portal_payments.sql` was added outside the original
phase prompts. Migration `0007_message_log.sql` adds the Phase 5 message log. Migration
`0008_tenant_payments.sql` adds tenant-submitted payment notices and token-scoped payment
instructions; apply it manually after `0007` before deploying Phase 6.

`0009_utilities.sql` adds utility bill snapshots and meter readings, links utility
charges to bills, and provides atomic create/undo RPCs plus a token-scoped tenant charges
function. Apply it manually after `0008` before deploying Phase 7. The checked-in
`src/types/database.ts` is aligned to the migration; regenerate it against Supabase
after the migration has been applied.

- Name files with a four-digit number and a short name, for example `0001_core_tables.sql`.
- Never edit an old migration. Every change is a new numbered file.
- Changes are additive only: new tables, new nullable columns, or columns with a safe default.
  Never drop, rename or retype an existing table or column.
- Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Every new table has Row Level Security enabled, with policies so a landlord only sees their own data.
- After each migration, regenerate the TypeScript types: `npm run types:gen`
  (needs the Supabase CLI and `SUPABASE_PROJECT_ID` set in your shell).
