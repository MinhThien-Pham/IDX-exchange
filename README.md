# IDX Exchange

A personal full-stack property search project built with **PERN: PostgreSQL, Express, React, and Node.js**. Users can filter and sort listings, browse pages of results, view property details and photos, inspect locations, and review open house schedules.

This TypeScript monorepo contains a React/Vite web app, a modular Express API, and shared API contracts. Deployment uses two Vercel projects and a Neon PostgreSQL database.

## Stack

| Area         | Technology                                         | Responsibility                                             |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------- |
| Web          | React, TypeScript, Vite                            | Components, interaction, frontend builds                   |
| Navigation   | React Router                                       | Pages and shareable search URLs                            |
| Server state | TanStack Query                                     | API requests, cancellation, caching, loading/error state   |
| API          | Node.js, Express, TypeScript                       | HTTP adapters and application composition                  |
| Validation   | Zod                                                | Request, environment, and API response validation          |
| Persistence  | PostgreSQL, Drizzle, `pg`                          | Structured data, parameterized queries, connection pooling |
| Tests        | Jest, Supertest, React Testing Library, Playwright | Unit, HTTP, database integration, browser tests            |
| Quality      | ESLint, Prettier, GitHub Actions                   | Static checks, architectural boundaries, CI                |

The project uses React directly; Next.js and NestJS are not required.

## Architecture

The backend is a **modular monolith**: one API with separate `listings` and `open-houses` business modules. Each module follows a small Clean Architecture structure.

```mermaid
flowchart LR
    Browser[React pages and components] --> Query[TanStack Query / API client]
    Query --> HTTP[Express routes / middleware / controllers]
    HTTP --> UseCase[Application use cases]
    UseCase --> Port[Repository interfaces]
    Repository[PostgreSQL repositories] -. implements .-> Port
    Repository --> DB[(PostgreSQL)]
```

At runtime, a use case calls the repository instance supplied at startup. In source code, the use case depends on a repository **interface**, while the PostgreSQL repository implements it. Domain and application code do not import Express, Zod, Drizzle, or database connection code.

| Layer          | What belongs here                                                    |
| -------------- | -------------------------------------------------------------------- |
| Domain         | Canonical `Listing` and `OpenHouse` business types                   |
| Application    | Use cases, business rules, repository ports                          |
| Infrastructure | PostgreSQL queries and persistence mapping                           |
| Presentation   | Routes, controllers, HTTP validation, responses                      |
| Platform       | Shared configuration, database connections, logging, HTTP middleware |

MVC responsibilities are present: React supplies the view, controllers adapt HTTP, and domain/application code represents the model and business behavior. The frontend and API are separate; the backend does not render MVC templates. Persistence is separated from the business model.

[backend/src/app.ts](backend/src/app.ts) and each module's `index.ts` assemble dependencies. [create-app.ts](backend/src/create-app.ts) builds the HTTP application with injected dependencies, allowing API tests to substitute repositories without opening a database connection. `npm run check:boundaries` checks the module and layer import rules.

### Follow a search through the code

For a request such as `/?city=Pasadena&beds=3&sortBy=price&sortOrder=ASC`:

1. [ListingsPage](frontend/src/pages/ListingsPage.tsx) renders the feature. [useListingSearch](frontend/src/features/listings/hooks/useListingSearch.ts) reads and validates URL parameters; changing filters updates the URL and resets the offset.
2. [useListings](frontend/src/features/listings/hooks/useListings.ts) uses the normalized search as its query key. The [listing API adapter](frontend/src/features/listings/api/listings.api.ts) and [HTTP client](frontend/src/shared/api/client.ts) request `GET /api/v1/listings?...`.
3. [create-app.ts](backend/src/create-app.ts) adds request IDs/logging, CORS, JSON parsing, and module routes. The [listing router](backend/src/modules/listings/presentation/listing-routes.ts) validates input using the shared [Zod contracts](packages/contracts/src/index.ts).
4. The [controller](backend/src/modules/listings/presentation/listing-controller.ts) calls [SearchListings](backend/src/modules/listings/application/use-cases/search-listings.ts). This use case checks the price range and depends on [ListingRepository](backend/src/modules/listings/application/ports/listing-repository.ts).
5. [PostgresListingRepository](backend/src/modules/listings/infrastructure/postgres-listing-repository.ts) builds parameterized Drizzle queries. A fixed sort map prevents user input from becoming SQL column names. Count and page use one repeatable-read snapshot.
6. The repository maps selected fields to canonical listing data, the controller returns JSON, and the frontend validates the response and renders the result.

[asyncHandler](backend/src/platform/http/async-handler.ts) forwards rejected controller promises to the central [error handler](backend/src/platform/http/error-handler.ts), avoiding repeated `try/catch` blocks. Errors use stable codes and request IDs. Unexpected errors return safe messages; SQL, credentials, and private source fields are excluded from responses and routine error logs.

### Repository layout

```text
IDX-Exchange/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Router and providers
│   │   ├── pages/                  # Page composition
│   │   ├── features/
│   │   │   ├── listings/           # Components, hooks, API adapters
│   │   │   └── open-houses/
│   │   └── shared/                 # HTTP client, UI, formatting, config
│   └── vercel.json
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── listings/
│   │   │   │   ├── domain/
│   │   │   │   ├── application/    # Use cases and repository ports
│   │   │   │   ├── infrastructure/
│   │   │   │   ├── presentation/
│   │   │   │   └── index.ts        # Module composition
│   │   │   └── open-houses/        # Same layer boundaries
│   │   ├── platform/               # Config, DB, HTTP, logging
│   │   ├── shared/                 # Framework-independent errors
│   │   ├── create-app.ts           # HTTP application factory
│   │   ├── app.ts                  # Runtime wiring and Vercel export
│   │   └── server.ts               # Local listener and shutdown
│   ├── db/migrations/              # Reviewed, versioned SQL schema
│   ├── scripts/                    # Migrate, seed, legacy importer
│   ├── tests/
│   └── vercel.json
├── packages/contracts/             # Shared API DTOs and Zod schemas
├── e2e/                            # Real browser flows
├── scripts/check-boundaries.mjs
├── .github/workflows/ci.yml
└── package.json                    # npm workspaces and root commands
```

### Data design

- `listings` has an internal UUID and a unique `(source, external_id)` pair. Original MLS identifiers remain available as `externalId`; they are not the public detail route key.
- Prices use PostgreSQL `numeric`, ZIP codes remain strings, and bathrooms support decimals. Missing values stay `null` rather than becoming zero.
- A generated normalized city column supports indexed, trimmed, case-insensitive exact city searches. ZIP, price, and listing-date indexes support common queries.
- `open_houses` references a listing through a foreign key with cascade deletion. Calendar dates, wall-clock times, and an IANA time zone are stored explicitly.
- Source-specific fields are retained in private JSONB `raw_data`. Repositories explicitly select public DTO fields.
- TypeScript checks code at development/build time. Zod checks external values at runtime. Use cases enforce business rules; database constraints enforce stored data integrity.

See [schema.ts](backend/src/platform/db/schema.ts). Applied SQL migrations are recorded with checksums and a transaction-scoped advisory lock. Add a new numbered migration to change an existing database; do not edit an applied file.

## Run locally

### Prerequisites

- Node.js **22.12 or newer within Node 22** (`>=22.12.0 <23`).
- npm **10 or newer**, Git, and either local PostgreSQL or Neon.
- PostgreSQL 17 or a newer supported stable release is recommended; CI uses PostgreSQL 17.

From the repository root:

```sh
npm ci
```

The root lockfile covers all workspaces. Install from the root rather than maintaining separate frontend/backend lockfiles.

### Environment files

If an existing `backend/.env` contains old MySQL configuration, save a private copy under an ignored name such as `backend/.env.mysql-backup` before editing. The API now needs `DATABASE_URL`; `DB_HOST`, `DB_USER`, and similar variables are no longer used.

These PowerShell commands create missing files without replacing existing configuration:

```powershell
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

Edit `backend/.env`:

```dotenv
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://idx_app:your_password@localhost:5432/idx_exchange
# Optional direct connection to the SAME database/branch for migrations.
# DATABASE_MIGRATION_URL=postgresql://...
FRONTEND_ORIGINS=http://localhost:5173
LOG_LEVEL=info
```

For local PostgreSQL, first create the database and a login role using your database administration tool, then use that role's connection URL. For Neon, follow the next section and use the pooled URL. Preserve Neon's connection options, including SSL settings.

Edit `frontend/.env`:

```dotenv
# Blank locally: Vite proxies /api to the API on port 5000.
VITE_API_BASE_URL=
# Optional Maps Embed browser key.
VITE_GOOGLE_MAPS_API_KEY=
```

All `VITE_*` values are public build-time browser configuration. Database passwords and connection URLs belong only in backend configuration. Restart local servers after changing environment files.

### Migrate, seed, and start

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:5000**.

The dev command builds shared contracts before starting both applications. After changing contract definitions, restart `npm run dev` or rebuild `@idx/contracts` so the running API uses the updated package.

The seed upserts **12 invented listings and 3 open houses**, preserves existing non-demo records, and can be rerun without duplicates. Photos are external sample images; addresses and prices do not represent real homes for sale. Try `Pasadena`, `Irvine`, or ZIP `02108`. One listing intentionally has no price or coordinates.

Maps are optional. Without a key, properties with coordinates show a directions link. To embed maps, enable Google Maps Embed API and restrict the browser key to that API and your website domains. See [Maps Embed setup](https://developers.google.com/maps/documentation/embed/get-started).

## Create the Neon database

1. Sign up at [Neon](https://neon.com/) and create a project, for example `idx-exchange`. Choose PostgreSQL 17+ stable and a region close to the region used by the Vercel API.
2. Select the intended branch, database, and role in the **Connect** panel. Use the same branch/database for both URLs below.
3. Enable connection pooling and copy the PostgreSQL URL into `backend/.env` as `DATABASE_URL`.
4. Optionally turn pooling off in the Connect panel and copy the direct URL as `DATABASE_MIGRATION_URL`. The migration command prefers that URL and otherwise uses `DATABASE_URL`.
5. From the root, run `npm run db:migrate`, then `npm run db:seed`. These commands target the configured database. Confirm the tables in Neon's SQL editor or table browser.

Use the pooled URL for Vercel runtime traffic. Copy URLs from Neon's panel rather than manually editing credentials or hostnames. See [Neon connection instructions](https://neon.com/docs/connect/connect-from-any-app).

Migrations and seeding are explicit administrative commands. They do not run on API requests or automatically during a Vercel build. A separate branch/database can be used for local experiments; reserve a database named `idx_test` for automated tests.

## Deploy to Vercel

Use **two projects connected to the same GitHub repository**. Reuse the linked project for the frontend and import the repository again for the API. See [Vercel monorepos](https://vercel.com/docs/monorepos).

```text
Browser → frontend Vercel project → backend Vercel project → Neon PostgreSQL
```

### 1. API project

Import the repository as a second project, for example `idx-exchange-api`:

| Setting          | Value                                              |
| ---------------- | -------------------------------------------------- |
| Root Directory   | `backend`                                          |
| Framework        | Express, automatically detected                    |
| Node.js          | 22.x                                               |
| Install Command  | `cd .. && npm ci`                                  |
| Build Command    | Leave override disabled; use `backend/vercel.json` |
| Output Directory | Leave unset/default for Express                    |

Enable **Include source files outside of the Root Directory in the Build Step**. Both projects need the root workspace files and `packages/contracts`. See [Vercel build settings](https://vercel.com/docs/builds/configure-a-build#root-directory).

The API build command builds `@idx/contracts` and `@idx/api` from the root. [src/app.ts](backend/src/app.ts) default-exports Express; [server.ts](backend/src/server.ts) is the local listener. Vercel hosts Express as a Function. See [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

For reference, `backend/vercel.json` supplies this build command:

```sh
cd .. && npm run build -w @idx/contracts && npm run build -w @idx/api
```

Set API project variables for the environment you deploy:

| Variable           | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| `DATABASE_URL`     | Neon **pooled** PostgreSQL URL                            |
| `NODE_ENV`         | `production`                                              |
| `FRONTEND_ORIGINS` | Web origin, for example `https://idx-exchange.vercel.app` |
| `LOG_LEVEL`        | `info`                                                    |

`FRONTEND_ORIGINS` accepts comma-separated exact origins, including protocol, without paths or trailing slashes. Initially use the planned frontend domain and update it after deployment. `DATABASE_MIGRATION_URL` is needed only where migration commands run, not for API requests.

Deploy and note the API origin, for example `https://idx-exchange-api.vercel.app`. Check `/api/health/live` and `/api/health` before connecting the frontend. The API's bare `/` is not a website and may correctly return a JSON 404.

### 2. Existing frontend project

Replace previous Create React App settings:

| Setting                               | Value                                               |
| ------------------------------------- | --------------------------------------------------- |
| Root Directory                        | `frontend`                                          |
| Framework Preset                      | Vite                                                |
| Node.js                               | 22.x                                                |
| Install Command                       | `cd .. && npm ci`                                   |
| Build Command                         | Leave override disabled; use `frontend/vercel.json` |
| Output Directory                      | `dist`, relative to `frontend`                      |
| Include source outside Root Directory | Enabled                                             |

Remove stale CRA/custom build and output overrides. The committed build builds contracts and the Vite web app. Its rewrite serves `index.html` for browser page routes, including `/property/:id`, so direct refresh works. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

For reference, `frontend/vercel.json` supplies this build command:

```sh
cd .. && npm run build --workspace @idx/contracts && npm run build --workspace @idx/web
```

Set frontend variables:

```dotenv
VITE_API_BASE_URL=https://idx-exchange-api.vercel.app
VITE_GOOGLE_MAPS_API_KEY=your_optional_restricted_browser_key
```

Use the API **origin only**, without `/api`, `/api/v1`, or a trailing slash. The client appends `/api/v1`. In Vercel's variable form, paste values without surrounding quotes. Keep database variables out of the frontend project.

Deploy the web app, update API `FRONTEND_ORIGINS` to the actual web origin, and **redeploy the API**. Changing `VITE_*` values requires a **new frontend build/deployment**, because they are compiled into the browser bundle.

### 3. Production, previews, and access

- Check the project's Production Branch setting. A feature-branch push normally creates a preview; it does not replace `main` production until merged or explicitly promoted.
- Configure Production and Preview variables deliberately. Extra frontend preview domains must be explicitly added to API `FRONTEND_ORIGINS` followed by an API redeploy. Do not use wildcard CORS.
- Check API **Deployment Protection**. A protected API can return a Vercel login page even when CORS is correct. The URL used by a public demo must be publicly reachable under the project's protection settings. Never put a protection bypass secret in a `VITE_*` variable. See [Deployment Protection](https://vercel.com/docs/deployment-protection).

### 4. Verify the demo

1. `GET https://your-api-domain/api/health/live` returns `{ "status": "ok" }`.
2. `GET https://your-api-domain/api/health` returns `{ "status": "ok", "database": "connected" }` after reaching Neon.
3. `GET https://your-api-domain/api/v1/listings?city=Pasadena` returns seeded data.
4. On the web app, filter, sort, change page, open a detail, refresh that URL, inspect open houses, and return to the search.
5. For failed requests, match `X-Request-ID`/JSON `requestId` to API runtime logs.

### Free demo budget

Vercel Hobby is for personal, non-commercial projects. Neon Free currently includes **1 GB PostgreSQL storage/project and 100 CU-hours/project/month**. This small demo can operate at $0 within quotas; idle infrastructure may sleep and the first request can be slower. Limits were checked on **October 17, 2026** and can change. See [Vercel Hobby](https://vercel.com/docs/plans/hobby) and [Neon plans](https://neon.com/docs/introduction/plans).

Original local SQL dumps total roughly 677 MB; dump size is not PostgreSQL table/index size. Start with the small synthetic seed and measure actual storage before importing the full private dataset.

## API reference

| Method | Route                             | Result                                                                                   |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/api/health/live`                | Process liveness; no database query                                                      |
| GET    | `/api/health`                     | Database readiness; 503 if unavailable                                                   |
| GET    | `/api/openapi.json`               | Runtime API specification derived from contracts                                         |
| GET    | `/api/v1/listings`                | Paginated listing collection                                                             |
| GET    | `/api/v1/listings/:id`            | Listing by internal UUID, or 404                                                         |
| GET    | `/api/v1/listings/:id/openhouses` | Open house array; `[]` for an existing listing without events, 404 for a missing listing |

### Search parameters

| Parameter              | Meaning and accepted values                             | Default    |
| ---------------------- | ------------------------------------------------------- | ---------- |
| `city`                 | Trimmed, case-insensitive exact city; 1–100 characters  | Omitted    |
| `zipcode`              | Exact string; 1–20 characters, preserves leading zeros  | Omitted    |
| `minPrice`, `maxPrice` | Inclusive numbers, 0–999,999,999,999; minimum ≤ maximum | Omitted    |
| `beds`                 | Minimum bedrooms; integer 0–100                         | Omitted    |
| `baths`                | Minimum bathrooms; number 0–100, decimals allowed       | Omitted    |
| `limit`                | Integer 1–100                                           | `20`       |
| `offset`               | Integer 0–1,000,000                                     | `0`        |
| `sortBy`               | `price`, `listedAt`, `squareFeet`, `bedrooms`           | `listedAt` |
| `sortOrder`            | `ASC` or `DESC`                                         | `DESC`     |

Unknown, repeated, empty, or invalid query parameters return 400. Sorts use an ascending UUID tie-breaker and place null values last in either direction.

```http
GET /api/v1/listings?city=Pasadena&minPrice=700000&beds=3&baths=2.5&sortBy=price&sortOrder=ASC
```

The collection envelope is `{ total, limit, offset, results }`. Listings use canonical fields such as `id`, `externalId`, `price`, `bedrooms`, and `photos`; see [contracts](packages/contracts/src/index.ts). Dates use `YYYY-MM-DD`; open house times are local wall times accompanied by `timeZone`.

Errors have a consistent shape:

```json
{
  "error": {
    "code": "INVALID_SEARCH_RANGE",
    "message": "Minimum price must not exceed maximum price."
  },
  "requestId": "request-identifier"
}
```

The former `/api/properties` routes and raw MLS response fields are replaced by the versioned contract. Use the returned internal UUID for detail/open-house requests, not the original MLS `externalId`.

## Tests and quality checks

Run from the repository root:

```sh
npm run verify
```

This runs lint/boundary checks, TypeScript checks, Jest tests, production builds, and formatting checks. Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run format:check`. `npm run format` writes formatting changes.

### Real PostgreSQL integration

Create a separate database whose name contains a distinct `test` segment, such as `idx_test`. Tests refuse names such as `idx_exchange`. Never use demo/production databases: test cleanup deletes synthetic test records.

PowerShell example, replacing credentials with your test role:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://idx_app:your_password@localhost:5432/idx_test'
npm run test:integration
```

Without `TEST_DATABASE_URL`, the PostgreSQL suite is skipped; unit, normalization, HTTP, and frontend tests still run. With it, tests exercise migrations, real query filtering/sorting, decimals, foreign keys, UUID lookups, idempotent seed/import upserts, and constraints. API test doubles do not replace these database checks.

### Browser tests

```powershell
npx playwright install chromium
$env:E2E_DATABASE_URL = 'postgresql://idx_app:your_password@localhost:5432/idx_test'
npm run test:e2e
```

The command builds the application. Global setup checks the isolated database name, applies migrations, and upserts the synthetic seed. Playwright starts the built API and Vite preview server and checks search/filter/pagination/detail flows against the real API/database. Keep ports 5000 and 4173 free.

If Microsoft Edge is installed, `$env:PLAYWRIGHT_CHANNEL = 'msedge'` selects it as a local alternative. CI installs Chromium. See [playwright.config.ts](playwright.config.ts).

[GitHub Actions](.github/workflows/ci.yml) provisions PostgreSQL 17, runs `npm run verify` with database integration enabled, and runs browser tests. It does not run migrations against Neon; Vercel manages deployments separately.

At the time of this refactor, `npm audit --omit=dev` reports no production vulnerabilities. The full audit reports 19 moderate development-tooling findings through Jest's transitive `sprintf-js` dependency, with no patched release available. Recheck when dependencies change; a forced dependency downgrade is not applied.

## Import the original MySQL dataset

Runtime requires only PostgreSQL. `mysql2` is a development-only dependency for a one-time migration bridge.

1. Restore the ignored `rets_property.sql` and `rets_openhouse.sql` into private local MySQL/MariaDB using Workbench, phpMyAdmin, or MySQL's `SOURCE` command. The importer reads tables, not dump text. PowerShell does not support Bash-style `mysql ... < file.sql`.
2. Run PostgreSQL migrations against the intended destination.
3. Add private source settings to `backend/.env`:

```dotenv
LEGACY_MYSQL_URL=mysql://user:encoded_password@localhost:3306/rets
LEGACY_SOURCE=crmls
LEGACY_TIME_ZONE=America/Los_Angeles
```

URL-encode special characters in credentials. `LEGACY_SOURCE` is the stable namespace for external listing IDs; keep it consistent on reruns. Use the actual source's IANA time zone.

Inspect a dry run, then explicitly enable writes:

```sh
npm run db:import -- --limit=1000
npm run db:import -- --write --batch-size=250
```

`--limit` applies independently to each table. Without `--write`, PostgreSQL is not modified. The explicit workspace command is also available:

```sh
npm run db:import-legacy --workspace @idx/api -- --write --batch-size=250
```

The importer pages by each table's integer primary key, normalizes data, upserts by source identity, preserves destination UUIDs, and maps open houses to listing UUIDs. It reports missing IDs, invalid values/dates, and orphan events as counts. Invalid optional values become `null`; events without a valid date or matching listing are skipped. Offset timestamps are converted to the configured source zone when needed. Photos are restricted to HTTP(S) URLs.

The source receives `SELECT` queries only. Pause its writer during a full migration: the original MyISAM open-house table cannot provide a transactional snapshot. Destination upserts can be resumed by rerunning; records missing from a later source export are not deleted. This bridge is not live MLS synchronization. Normalization and the real PostgreSQL destination path are tested; verify the bridge against your restored MySQL service before a full import.

## Local learning material and Git hygiene

The progressive Vietnamese curriculum lives locally under `docs/learning-local/`. It introduces concepts as requirements appear and traces React interactions through HTTP, controllers, use cases, repositories, validation, and SQL. The directory is deliberately ignored and **not included in a fresh clone**; copy it separately when moving machines. This public README is the reproducible setup/architecture guide.

Environment files, private dumps, local lessons, generated builds, coverage, Playwright traces/screenshots, and temporary work artifacts are excluded from Git. Reviewed SQL under `backend/db/migrations/` is intentionally committed; data dumps are not. Check `git status` and staged diffs before committing. Keep secrets and private data out of logs and example fixtures.

## Troubleshooting and current scope

| Symptom                                | Check                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| API fails on startup                   | PostgreSQL `DATABASE_URL` and exact `FRONTEND_ORIGINS`. Update old MySQL `.env` files. |
| Health returns 503                     | Database connectivity, credentials, SSL options, availability.                         |
| Health works but listing queries fail  | Migrations must target the same database/branch as runtime.                            |
| Web loads but API fails                | API origin, CORS, Deployment Protection; check for a login HTML response.              |
| Vercel cannot resolve `@idx/contracts` | Include files outside Root Directory; use root install/workspace builds.               |
| Detail refresh gives Vercel 404        | Committed frontend rewrite, Vite `dist` output, no stale CRA settings.                 |
| Environment edit has no effect         | Restart locally; redeploy API; rebuild web for `VITE_*` changes.                       |
| Preview cannot call API                | Allow its exact origin; configure accessible API and Preview variables.                |

The application is a public, read-only listing browser. Authentication, saved searches, live MLS ingestion, radius search, and load-test results are outside the implementation. The module boundaries and stateless API provide a base for additions; traffic capacity still depends on measured query performance, database resources, and deployment quotas.
