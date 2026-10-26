<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Read docs/CONVENTIONS.md before every change; it is the source of truth for structure, naming and design rules.
- Pages live in src/pages and are lazy-loaded from thin route files in src/routes; keeps first load small.
- The app builds in TanStack Start spa mode; Netlify serves dist/client statically with a rewrite to /_shell.html, so there are no server functions in production.
- Supabase is the user's own project, reached only from the browser via src/lib/supabase.ts with the anon key; never use a service-role key.
- The public Supabase URL and anon key are defaults in src/lib/env.ts, overridable by VITE_* env vars; .env.local is gitignored and gets lost when the workspace resets.
- The service worker is registered only from src/lib/pwa.ts and never caches Supabase or auth requests.
- Route guards are components (RequireAuth, RequireOnboarded) in the _landlord layout, redirecting from effects; auth lives in React context, not router beforeLoad, because the session is browser-only in spa mode.
