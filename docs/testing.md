# Testing

## Test layers

| Layer                     | Tools                       | Location                                                | Database        |
| ------------------------- | --------------------------- | ------------------------------------------------------- | --------------- |
| Use cases and domain      | Jest                        | `backend/tests/use-cases.test.ts`, `home-types.test.ts` | In-memory ports |
| HTTP API                  | Jest, Supertest             | `backend/tests/api.test.ts`                             | In-memory ports |
| Configuration             | Jest                        | `backend/tests/environment.test.ts`                     | None            |
| PostgreSQL integration    | Jest                        | `backend/tests/integration/`                            | Real PostgreSQL |
| Web components and models | Jest, React Testing Library | `frontend/src/**/*.test.ts(x)`                          | Mocked `fetch`  |
| Architecture rules        | Node test runner            | `scripts/architecture-rules.test.mjs`                   | None            |
| Browser end-to-end        | Playwright, axe-core        | `e2e/listings.spec.ts`                                  | Real PostgreSQL |

## Running tests

```sh
npm test                    # API and web tests
npm run test:coverage       # the same with coverage thresholds
npm run check:boundaries    # architecture rules
```

### PostgreSQL integration tests

These run only when `TEST_DATABASE_URL` is set; otherwise they are skipped and the rest of the
suite still runs.

```sh
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/idx_test npm run test:integration
```

```powershell
$env:TEST_DATABASE_URL = 'postgresql://user:password@localhost:5432/idx_test'
npm run test:integration
```

The database name must contain a separate `test` segment (for example `idx_test`); other names are
refused. Tests apply migrations and delete only their own synthetic records, but never point them
at a demo or production database.

### Browser tests

```sh
npx playwright install chromium
E2E_DATABASE_URL=postgresql://user:password@localhost:5432/idx_test npm run test:e2e
```

The command builds the app. Global setup checks the database name, applies migrations and upserts
the demo seed. Playwright then starts the built API on port 5000 and the Vite preview server on
port 4173; both ports must be free. Set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Microsoft
Edge instead of Chromium.

## What the tests cover

**API and data**

- Request validation: unknown, repeated and out-of-range parameters, non-UUID IDs.
- Error mapping, request IDs, CORS, and asynchronous error forwarding without leaking internal
  messages to responses or logs.
- PostgreSQL behavior: constraints, foreign keys, case-insensitive city match, exact ZIP,
  fractional bathrooms, stable ordering with nulls last, pagination, home-type filtering across
  spellings, literal city prefixes, idempotent seed and import upserts, repeatable migrations.
- Import normalization: invalid dates, times, coordinates, numbers and photo URLs.

**Web app**

- URL parsing and history restoration, explicit form submission, independent location draft,
  sort composition, individual chip removal, out-of-range page recovery, phone sheet cancellation.
- Missing-data presentation, price per square foot conditions, image fallbacks, time-zone-aware
  open-house labels.
- City suggestions: debouncing, cancellation, keyboard and touch selection, ZIP bypass, failure
  message.
- Gallery counters, bounded navigation, Escape, focus return and scroll preservation.

**Browser (Playwright)**

- Search, sort, paging, keyboard navigation to a listing and return to the same search.
- Sticky desktop toolbar and sidebar layouts; phone portrait, landscape and 320 px layouts.
- Direct detail reload, invalid filters, zero results, unavailable links and network failure.
- City suggestions and home type across pagination, detail return and refresh.
- Automated axe checks (WCAG 2.0/2.1 A and AA rules) on results and dialogs in light and dark
  themes.

## Coverage

| Workspace | Statements | Branches | Functions | Lines |
| --------- | ---------- | -------- | --------- | ----- |
| API       | 90%        | 80%      | 90%       | 90%   |
| Web       | 80%        | 70%      | 70%       | 80%   |

The API thresholds assume the PostgreSQL integration suite runs; run `npm run test:coverage` with
`TEST_DATABASE_URL` set. API coverage excludes runtime startup and database setup files, which
integration tests exercise separately. Web coverage excludes test utilities and the DOM entry
point. Reports are written to each workspace's ignored `coverage/` folder.

## Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pushes to `main` and `develop`
and on pull requests:

1. Start a PostgreSQL 18 service; `TEST_DATABASE_URL` and `E2E_DATABASE_URL` point to its
   `idx_test` database.
2. `npm ci` with the Node.js version from `.nvmrc`.
3. `npm run verify:ci`: lint, architecture rules, typecheck, build, format check, and tests with
   coverage thresholds, including PostgreSQL integration tests.
4. Install Chromium and run the Playwright suite against the build.

CI does not touch Neon or deploy; Vercel builds deployments separately.
