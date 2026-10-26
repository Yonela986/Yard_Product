# Yard

Yard is a mobile-first rent and tenant management application for backyard-room
landlords in South Africa. Landlords manage rooms, tenants, rent, utility charges and
payments from an installable web app. Tenants can use a private link from their landlord
to view their rent information without creating an account or installing an app.

Yard works alongside WhatsApp by opening the landlord's WhatsApp app with a message
prepared for review. The landlord chooses whether to send it. Yard is not a WhatsApp
bot and does not use the WhatsApp Business API.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Application routes](#application-routes)
- [Database and migrations](#database-and-migrations)
- [Development commands](#development-commands)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Conventions](#conventions)
- [Authors](#authors)

## Features

### Landlord workspace

- Sign in with a South African cellphone number and an SMS verification code.
- Complete onboarding by creating a property and its rooms.
- View active rooms, vacancies, inactive rooms and previous tenants.
- Add and edit rooms, including monthly rent and the rent due day.
- Add tenants to rooms, update tenant details and move tenants out.
- Review current balances, rent status and tenant statements.
- Generate monthly rent charges and review collection totals.
- Record payments, assign receipts, view payment details and void a payment with a
  reason when a correction is needed.
- Review tenant-submitted payment notices and confirm or decline them.
- Create electricity and water bills, allocate charges to occupied rooms and review
  utility bill details.
- Prepare tenant welcome, receipt and reminder messages for WhatsApp.
- Review monthly income reports and download statements or receipts as PDFs.

### Tenant access

- Open a private, token-based tenant link without signing in.
- View the room and rent details, current balance, payment status and recent charges.
- Review confirmed payment history and download receipt PDFs.
- Read the landlord's payment instructions and submit a payment notice with optional
  proof of payment.
- Contact the landlord through available WhatsApp or phone links.

### Public landing page and installable app

- Visitors who are not signed in see a public landing page at `/`.
- Signed-in landlords are directed to Home or onboarding, depending on their account.
- The app is installable as a Progressive Web App (PWA), with `/home` as the installed
  app's start page.
- The app shell supports offline navigation. Supabase and authentication requests are
  not cached by the service worker; features that need live data require a connection
  unless they have data available through the app's offline read cache.

## Technology

- React 19 and TypeScript with strict type checking
- Vite and TanStack Start in single-page application mode
- TanStack Router for file-based routes
- TanStack Query for server-state fetching and caching
- Tailwind CSS v4 for styling
- Supabase for authentication, PostgreSQL, Row Level Security and storage
- Zod for validation
- Vitest, Testing Library and axe-core for tests
- Netlify for static hosting

## Requirements

- Node.js 22.12 or later
- npm
- A Supabase project for authentication and application data
- The Supabase CLI if generating TypeScript database types

## Getting started

1. Clone the repository and open its directory:

   ```sh
   git clone <repository-url>
   cd yard
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a local environment file:

   ```sh
   Copy-Item .env.example .env.local
   ```

   In a POSIX shell, use `cp .env.example .env.local` instead.

4. Set the required Supabase environment variables in `.env.local`. Use the project URL
   and the publishable anon key from the Supabase project. Do not use a service-role key
   in the browser application.

5. Ensure the database migrations have been applied to the Supabase project. See
   [Database and migrations](#database-and-migrations).

6. Start the development server:

   ```sh
   npm run dev
   ```

   Open the local URL printed by Vite.

The application includes public Supabase URL and anon-key defaults in
`src/lib/env.ts`. Environment variables override those defaults. Configure your own
Supabase project for local development and deployment if you do not intend to use the
default project.

## Environment variables

| Variable                 | Required                          | Purpose                                                                      |
| ------------------------ | --------------------------------- | ---------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | No, if using the built-in default | Supabase project URL                                                         |
| `VITE_SUPABASE_ANON_KEY` | No, if using the built-in default | Supabase publishable anon key                                                |
| `VITE_PUBLIC_APP_URL`    | No                                | Production public URL used for canonical and social metadata and the sitemap |

Vite variables prefixed with `VITE_` are included in the client build. They must never
contain secrets. The Supabase anon key is intended for client use and relies on
appropriate Row Level Security policies for data protection. A service-role key must
never be added to `.env.local`, Netlify's client build variables or frontend code.

To configure phone sign-in, configure the Supabase phone authentication provider and
SMS delivery, and allow the deployed site URL in Supabase Authentication URL settings.
For deployed tenant payment notices, configure the `tenant-payment` Edge Function and
its allowed browser origins as described in the relevant Supabase function setup.

See [.env.example](./.env.example) and [docs/NETLIFY.md](./docs/NETLIFY.md) for
environment setup.

## Application routes

| Route                                    | Purpose                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `/`                                      | Public landing page; signed-in users are routed to the appropriate app page |
| `/sign-in`                               | Landlord phone-number sign-in                                               |
| `/onboarding`                            | Initial landlord, property and room setup                                   |
| `/home`                                  | Collection summary, quick actions and tenant status groups                  |
| `/rooms`                                 | Active rooms, vacancies and inactive rooms                                  |
| `/rooms/:roomId`                         | Room details and tenant history                                             |
| `/tenants/new`                           | Add a tenant to a room                                                      |
| `/tenants/:tenantId`                     | Tenant details, balance and statement                                       |
| `/tenants/:tenantId/edit`                | Edit tenant details                                                         |
| `/tenants/:tenantId/payments/new`        | Record a landlord payment                                                   |
| `/tenants/:tenantId/payments/:paymentId` | Payment detail, proof, receipt and payment actions                          |
| `/payments/pending`                      | Review tenant-submitted payment notices                                     |
| `/money`                                 | Money and report navigation                                                 |
| `/money/income`                          | Monthly income report selection                                             |
| `/money/income/:month`                   | Income report for a selected month                                          |
| `/money/utilities`                       | Utility bills                                                               |
| `/money/utilities/new`                   | Create a utility bill                                                       |
| `/money/utilities/:billId`               | Utility bill details                                                        |
| `/remind`                                | Prepare reminders for tenants who are late                                  |
| `/settings`                              | Landlord and property settings                                              |
| `/t/:token`                              | Public tenant page for a private tenant link                                |
| `/dev/kit`                               | Development-only UI and connection test kit                                 |

Route path constants are maintained in `src/router/paths.ts`. Access to landlord routes
is protected by the authentication and onboarding guards.

## Database and migrations

Database schema changes are kept in `supabase/migrations/`. Migrations are numbered,
additive SQL files and should be applied in order. In the current workflow, migrations
are applied manually in the Supabase SQL Editor before deploying the matching frontend
changes.

| Migration                         | Main purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------------ |
| `0001_core_tables.sql`            | Landlords, properties, rooms and onboarding foundation                   |
| `0002_tenants.sql`                | Tenant records and landlord-managed tenant operations                    |
| `0003_public_tenant_page.sql`     | Token-scoped public tenant page lookup                                   |
| `0004_charges_and_balances.sql`   | Charges, payments foundation, tenant balances and rent-charge generation |
| `0005_payments_and_receipts.sql`  | Payment recording, receipt numbers, proof storage policies and voiding   |
| `0006_tenant_portal_payments.sql` | Public tenant balance and confirmed receipt access                       |
| `0007_message_log.sql`            | Landlord message activity log                                            |
| `0008_tenant_payments.sql`        | Tenant payment notices, instructions and related RPCs                    |
| `0009_utilities.sql`              | Utility bills, meter readings, allocations and tenant charge lookup      |
| `0010_report_indexes.sql`         | Indexes used by reports                                                  |

Before applying a migration:

1. Confirm the latest migration already applied to the target Supabase project.
2. Apply each unapplied migration in numerical order using the Supabase SQL Editor.
3. Verify the SQL completes successfully before deploying frontend code that depends on
   it.
4. Regenerate or verify the checked-in TypeScript types when the schema changes.

To generate database types with the Supabase CLI, set `SUPABASE_PROJECT_ID` in your
shell and run:

```sh
npm run types:gen
```

This command overwrites `src/types/database.ts`; review the generated diff before
including it in a change. See [docs/MIGRATIONS.md](./docs/MIGRATIONS.md) and
[docs/CONVENTIONS.md](./docs/CONVENTIONS.md) for migration and schema rules.

## Development commands

| Command              | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start the Vite development server                     |
| `npm run dev:host`   | Start Vite accessible on the local network            |
| `npm run build`      | Build the production application                      |
| `npm run preview`    | Preview a production build locally                    |
| `npm run typecheck`  | Run the TypeScript compiler without emitting files    |
| `npm run lint`       | Run ESLint across the repository                      |
| `npm run format`     | Format repository files with Prettier                 |
| `npm run test`       | Run the Vitest test suite                             |
| `npm run test:watch` | Run Vitest in watch mode                              |
| `npm run perf:check` | Build and enforce the landing page bundle-size budget |
| `npm run copy:check` | Check product copy and visual-style rules             |
| `npm run icons`      | Generate PWA icon assets from the checked-in source   |
| `npm run types:gen`  | Generate Supabase TypeScript types                    |

Before submitting code changes, run the relevant tests, `npm run typecheck`, and
`npm run lint`. For user-facing copy and landing page changes, also run
`npm run copy:check` and `npm run perf:check`.

## Project structure

```text
docs/                 Project conventions, migration, deployment and launch documentation
public/               PWA assets and public static files
scripts/              Asset generation and project checks
supabase/
  migrations/         Numbered PostgreSQL migrations
  functions/          Supabase Edge Functions
src/
  components/
    layout/           Shared application layouts and page headers
    ui/               Reusable interface components
  features/            Feature-specific API, hooks, schemas and components
  lib/                 Shared helpers, Supabase client and query configuration
  pages/               Screen components loaded by route files
  routes/              Thin TanStack file-based route definitions
  router/              Router path constants
  styles/              Global styles and design tokens
  types/               Database and application types
```

Feature code owns its Supabase API calls, query hooks and validation schemas. Pages and
components should use those feature interfaces rather than accessing Supabase directly.
See [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) for code structure, design, accessibility
and data-handling rules.

## Deployment

Yard is deployed to Netlify as a static single-page application. The Netlify build
configuration is in [netlify.toml](./netlify.toml):

- Build command: `npm run build`
- Publish directory: `dist/client`
- Route fallback: `/_shell.html`
- Node.js major version: 22 (22.12 or later)

Set the intended Supabase URL and anon key in the Netlify environment for the deploy
context. Set `VITE_PUBLIC_APP_URL` to the canonical production origin so canonical and
social preview metadata and the sitemap are generated for that address. These values
are included at build time, so changing them requires a new deploy.

The app's manifest start URL remains `/home`. Tenant routes retain their no-index and
no-referrer response headers. Review [docs/NETLIFY.md](./docs/NETLIFY.md) and
[docs/LAUNCH-CHECKLIST.md](./docs/LAUNCH-CHECKLIST.md) before production deployment.

## Security and privacy

- Supabase access from the app runs in the browser with the publishable anon key.
- Database access must be protected by Row Level Security and ownership checks.
- Tenant pages use private, token-scoped database functions; tenants are not granted
  direct access to landlord, tenant, charge or payment tables.
- Payment proof files are stored in the private `payment-proofs` bucket and displayed
  through short-lived signed URLs.
- Do not place service-role credentials or other secrets in frontend code, `VITE_`
  variables, or committed files.
- The service worker must not cache Supabase or authentication requests.
- Tenant URLs contain private access tokens. Do not post real tenant URLs or personal
  information in screenshots, issues or public logs.

Report suspected security issues privately to the project maintainers rather than
publishing exploit details.

## Conventions

- Use TypeScript strict mode and avoid `any`.
- Store monetary values as integer cents in South African rand.
- Treat calendar dates as `YYYY-MM-DD` strings and months as `YYYY-MM`.
- Keep route definitions thin and lazy-load page components.
- Keep migrations additive; never edit an already-applied migration.
- Preserve the mobile-first, accessible visual conventions described in
  [docs/CONVENTIONS.md](./docs/CONVENTIONS.md).

## Authors

- Lwando Ntlemeza
- Yonela Futho
