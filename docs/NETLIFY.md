# Deploying Yard to Netlify

`netlify.toml` already holds the build settings:

- Build command: `npm run build`
- Publish directory: `dist/client`
- Every path is rewritten to `/_shell.html` with status 200, so links like `/t/abc` work.
- Node.js 22 is selected for builds. The current TanStack Start and Supabase dependencies
  require Node.js 22.12 or later; keep the Netlify `NODE_VERSION`, `.nvmrc`, and
  `package.json` engine requirement aligned.

## Environment variables

The project's public Supabase URL and anon key are built in as defaults
(`src/lib/env.ts`), so no variables are required. To point a build at a different
Supabase project, open **Site configuration > Environment variables > Add a variable** and add:

| Key                      | Value                                                   |
| ------------------------ | ------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase > Project Settings > API > Project URL         |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > `anon` `public` key |

Never add the service-role key. After adding or changing a variable, run
**Deploys > Trigger deploy > Clear cache and deploy site**, because the values are
baked into the build. If one is missing, the app shows a full-screen message naming it.
Netlify's build secrets scanner omits `VITE_SUPABASE_ANON_KEY` because the Supabase anon
key is intentionally public and must be included in the browser bundle. Secrets scanning
remains enabled for all other values; never put a service-role key or other secret in a
`VITE_` variable.

For phone sign-in in Phase 1, add the Netlify site URL under
Supabase > Authentication > URL Configuration.
