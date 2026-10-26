# tenant-payment

This public Edge Function accepts tenant payment notices. It uses
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Edge Function environment only;
do not copy either secret into frontend variables or `.env.example`.

After applying `supabase/migrations/0008_tenant_payments.sql` in the Supabase SQL editor:

```sh
supabase secrets set ALLOWED_ORIGINS="https://your-site.netlify.app"
supabase functions deploy tenant-payment --no-verify-jwt
```

For more than one deployed origin, use a comma-separated value:

```sh
supabase secrets set ALLOWED_ORIGINS="https://yard.example.com,https://preview--yard.netlify.app"
```

`http://localhost` and `http://localhost:<port>` are allowed for local development.
Every other browser origin must exactly match an origin in `ALLOWED_ORIGINS`.

Test against a deployed function with a real tenant token:

```sh
curl -i "https://YOUR_PROJECT_REF.supabase.co/functions/v1/tenant-payment" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -F "token=YOUR_TENANT_TOKEN" \
  -F "amount_cents=120000" \
  -F "paid_on=2026-10-12" \
  -F "method=eft"
```

To test proof upload, add `-F "proof=@/path/to/receipt.jpg"` to the request. The function
checks file signatures and actual byte limits; a filename or declared content type is
not considered proof of the file format.
