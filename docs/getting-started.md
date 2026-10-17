# Getting started

## Requirements

| Tool       | Version                                                       |
| ---------- | ------------------------------------------------------------- |
| Node.js    | 24.x (see `.nvmrc`; CI and Vercel use the same major version) |
| npm        | 11 or newer (CI uses npm 12.2.0)                              |
| PostgreSQL | A local server or a Neon database. CI uses PostgreSQL 18.     |
| Git        | Any recent version                                            |

## Install

From the repository root:

```sh
npm ci
```

The root lockfile covers all workspaces; do not install inside `frontend/` or `backend/`
separately.

## Configure the environment

Create the two local environment files from their examples. Neither file is committed.

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

### `backend/.env`

| Variable                 | Required    | Example / default                                           | Purpose                                                                     |
| ------------------------ | ----------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`           | Yes         | `postgresql://idx_app:password@localhost:5432/idx_exchange` | Runtime connection. On Neon, use the **pooled** URL.                        |
| `DATABASE_MIGRATION_URL` | No          | Neon direct (unpooled) URL                                  | Used by `db:migrate` when set; must point to the same database              |
| `FRONTEND_ORIGINS`       | No          | `http://localhost:5173`                                     | Comma-separated exact origins allowed by CORS; no paths or trailing slashes |
| `PORT`                   | No          | `5000`                                                      | Local API port                                                              |
| `NODE_ENV`               | No          | `development`                                               | `development`, `test` or `production`                                       |
| `LOG_LEVEL`              | No          | `info`                                                      | `info` or `silent`                                                          |
| `MLS_MYSQL_URL`          | Import only | `mysql://user:password@localhost:3306/rets`                 | Source database for `db:import`                                             |
| `MLS_SOURCE`             | Import only | `crmls`                                                     | Namespace stored with each imported record                                  |
| `MLS_TIME_ZONE`          | Import only | `America/Los_Angeles`                                       | IANA zone of the source's open-house times                                  |

The API validates these values at startup and exits with a message naming any invalid variable.

### `frontend/.env`

| Variable                   | Required | Purpose                                                                                 |
| -------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`        | No       | API origin without `/api`. Leave empty locally: Vite proxies `/api` to port 5000.       |
| `VITE_GOOGLE_MAPS_API_KEY` | No       | Maps Embed API key. Without it, listings show a "Get directions" link instead of a map. |

`VITE_*` values are compiled into the browser bundle and are public. Never put database URLs or
other secrets in frontend environment files. Restrict a Maps key to the Maps Embed API and your
site's domains.

## Prepare the database

Create an empty database and a login role with your PostgreSQL tools (or create a Neon project;
see [Deployment](deployment.md)), set `DATABASE_URL`, then run:

```sh
npm run db:migrate   # apply SQL migrations in backend/db/migrations
npm run db:seed      # upsert 12 invented listings and 3 open houses
```

Both commands are safe to repeat. The seed updates only its own `demo` records. Example searches
for the seed: `Pasadena`, `Irvine`, ZIP `02108`. One seeded listing intentionally has no price
and no coordinates.

To load the real dataset instead, see [Data import](data-import.md).

## Run

```sh
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000 (try http://localhost:5000/api/health)

`npm run dev` builds `@idx/contracts` once and starts both apps in watch mode. After changing a
contract, restart it so the API picks up the rebuilt package.

## Commands

| Command                    | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`              | Start the API and the web app in watch mode                             |
| `npm run build`            | Build contracts, API and web app                                        |
| `npm run lint`             | ESLint and the architecture boundary check                              |
| `npm run check:boundaries` | Architecture rule tests and the import scan only                        |
| `npm run typecheck`        | TypeScript for all workspaces and root tooling                          |
| `npm run format`           | Format with Prettier (`format:check` verifies only)                     |
| `npm test`                 | API and web tests; PostgreSQL tests run when `TEST_DATABASE_URL` is set |
| `npm run test:integration` | PostgreSQL integration tests only                                       |
| `npm run test:coverage`    | Tests with coverage thresholds                                          |
| `npm run test:e2e`         | Build, then Playwright tests against a real API and `E2E_DATABASE_URL`  |
| `npm run check`            | Lint, typecheck, build and format check                                 |
| `npm run verify`           | `check` plus tests                                                      |
| `npm run verify:ci`        | `check` plus coverage, as run in CI                                     |
| `npm run db:migrate`       | Apply migrations                                                        |
| `npm run db:seed`          | Upsert the demo data                                                    |
| `npm run db:import`        | Import the MLS MySQL dataset (dry run unless `--write`)                 |

Test databases and browser tests are described in [Testing](testing.md).

## Dependency notes

- **TypeScript.** Builds and type checks use TypeScript 7 (`@typescript/native`). ESLint's
  TypeScript integration still needs the TypeScript 6 compiler API, so `typescript` is installed
  through an npm alias to the TypeScript 6 package. Both are pinned in the root `package.json`.
- **Install scripts.** npm 12 runs dependency install scripts only for packages listed in the
  root `allowScripts` field, pinned to reviewed versions (`@parcel/watcher`, `@swc/core`,
  `esbuild`, `unrs-resolver`). Review a changed script before approving a new version.
- **Overrides.** A scoped override moves the coverage tool's YAML parser to `js-yaml` 4. See
  [Decisions](decisions.md).

## Troubleshooting

| Symptom                                            | Check                                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| API exits with "Invalid environment configuration" | The listed variables in `backend/.env`. `FRONTEND_ORIGINS` must be exact origins without a trailing slash. |
| `/api/health` returns `503`                        | The database is running, the URL and credentials are correct, SSL options are kept for Neon.               |
| Health works but listing requests fail             | Migrations were applied to the same database that `DATABASE_URL` points to.                                |
| The web app shows "Listings couldn't load"         | The API is running on port 5000, or `VITE_API_BASE_URL` points to the right origin.                        |
| Browser console shows a CORS error                 | Add the exact web origin to `FRONTEND_ORIGINS` and restart the API.                                        |
| A contract change has no effect                    | Restart `npm run dev` so `@idx/contracts` is rebuilt.                                                      |
| An environment change has no effect                | Restart the dev servers. `VITE_*` changes need a rebuild of the web app.                                   |
| `npm run test:e2e` says a port is in use           | Stop other servers on ports 5000 and 4173 (for example a running `npm run dev`).                           |
