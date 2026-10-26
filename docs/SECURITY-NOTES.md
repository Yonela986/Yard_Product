# Phase 6 security notes

## Migration review

`0006_tenant_portal_payments.sql` defines `get_tenant_page_v2(text)` and
`get_tenant_receipts(text)`. Both are `SECURITY DEFINER`, set `search_path` to
`public`, revoke execution from `PUBLIC`, and grant execution only to `anon` and
`authenticated`. Both compare the supplied token exactly to `tenants.access_token`.
They return selected tenant/payment fields only; receipt history filters to confirmed
payments with a receipt number. The void flow changes a voided payment to `declined`,
so it is excluded from confirmed history.

Neither function explicitly rejected null, empty, or short tokens in migration 0006.
An exact comparison normally produces no result for those values, but the `access_token`
column does not enforce a minimum length. Migration `0008_tenant_payments.sql` adds
explicit 32-character guards to the existing public tenant functions and excludes
voided rows from receipt history. The new `tenant_payment_info(text)` function also
rejects null and short tokens and returns only the tenant's payment instructions and
recent own notices.

Migrations `0001` through `0007` enable RLS and explicitly revoke `anon` table access
for each application table; the balance view also revokes `anon`. Migration 0008 does
not introduce a table. Since the live project's grants cannot be inspected from this
workspace, run the checks below after applying it and verify the results in Supabase.

The earlier migrations left trigger-only functions with PostgreSQL's default `PUBLIC`
execute privilege. Migration 0008 revokes public execution from those trigger functions;
the trigger registrations continue to invoke them. `today_sa()` is intentionally a
harmless public date helper. Other `anon`-callable routines are tenant-page functions
that require an exact private token.

## Checks to run after applying migration 0008

```sql
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
```

Expected: no rows.

```sql
select routine_name
from information_schema.routine_privileges
where grantee = 'anon' and routine_schema = 'public';
```

Expected: `get_tenant_page`, `get_tenant_page_v2`, `get_tenant_receipts`,
`tenant_payment_info`, and the harmless `today_sa` helper only. If other routines
appear, review their grants before production use.
