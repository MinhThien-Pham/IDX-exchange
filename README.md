# IDX Exchange

Residential property search built with **PostgreSQL, Express, React and Node.js (PERN)** in
TypeScript. Visitors search listings by location, budget, rooms and home type, sort and page
through results, and open a listing to see its photos, facts, location and open houses.

Developed individually for the **IDX Exchange Software Development Engineer Internship (Summer 2026)**. The project is a TypeScript monorepo with a modular Express API, PostgreSQL and shared
API contracts, deployed to Vercel and Neon.

**Live demo:** https://idx-exchange-three.vercel.app · **API:**
https://idx-exchange-api.vercel.app/api/openapi.json

## Features

- **Search**: one "City or ZIP code" field with city suggestions from the inventory, price range,
  minimum bedrooms and bathrooms, and a home-type filter (Single-family, Condo, Townhouse and
  others).
- **Results**: eight sort orders, stable server-side pagination, removable filter chips, and
  shareable URLs that restore the same search after a refresh or a browser Back.
- **Listing detail**: photo gallery with a full-screen viewer, key facts, price per square foot,
  map or directions link, and open houses labeled by their status in the property's time zone.
- **Responsive layout**: sticky desktop toolbar with a filter sidebar, and a phone layout with a
  bottom action bar and filter sheet. Light and dark themes are available.
- **Recovery paths**: invalid searches, empty results, failed requests, missing photos and
  unavailable listings each show a clear message and a next step.
- **Read-only, versioned API** (`/api/v1`) with request validation, structured errors, request
  IDs and an OpenAPI document.

## Data

Production data is a historical MLS (RETS) snapshot supplied by the internship program:
approximately 54,000 residential listings, mostly in California, with their recorded open houses.
It is imported into PostgreSQL once and is **not a live MLS feed**. Prices, availability and
open-house dates reflect the time of the export. Local development uses 12 invented demo
listings instead. See [Data import](docs/data-import.md).

## Tech stack

| Area         | Technology                                                   |
| ------------ | ------------------------------------------------------------ |
| Web          | React 19, React Router 7, Vite, Lucide icons                 |
| Server state | TanStack Query                                               |
| API          | Node.js 24, Express 5                                        |
| Contracts    | Zod schemas shared by the API and the web app                |
| Database     | PostgreSQL (18 in CI), Drizzle ORM, `pg`                     |
| Tests        | Jest, Supertest, React Testing Library, Playwright, axe-core |
| Hosting      | Vercel (two projects), Neon PostgreSQL                       |

## Getting started

Requires Node.js 24, npm 11 or newer, and a PostgreSQL database.

```sh
npm ci
cp backend/.env.example backend/.env    # set DATABASE_URL
cp frontend/.env.example frontend/.env
npm run db:migrate
npm run db:seed                         # 12 invented listings and 3 open houses
npm run dev                             # web on :5173, API on :5000
```

| Command             | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Start the API and the web app in watch mode                   |
| `npm run verify`    | Lint, architecture checks, typecheck, build, format and tests |
| `npm test`          | API and web unit, component and HTTP tests                    |
| `npm run test:e2e`  | Playwright browser tests against a real API and test database |
| `npm run db:import` | Import the MLS dump files (dry run unless `--write`)          |

Full setup, environment variables and troubleshooting: [Getting started](docs/getting-started.md).

## Architecture in brief

```
React feature ─▶ query hook ─▶ API adapter ──HTTP /api/v1──▶ route ─▶ Zod validation ─▶ controller
                                                                                        │
                                                                                        ▼
                                          PostgreSQL ◀── repository (Drizzle) ◀── use case
                                                          implements port ──────────▲
```

- The API is a **modular monolith**. `listings` and `open-houses` each have `domain`,
  `application` (use cases and repository ports), `infrastructure` (PostgreSQL) and
  `presentation` (routes and controllers) layers.
- Use cases depend on repository **interfaces**. The composition root supplies the PostgreSQL
  implementations, and API tests supply in-memory ones.
- Controllers are wrapped by one `asyncHandler`. A central error handler maps business errors to
  HTTP status codes, so controllers contain no `try/catch`.
- `packages/contracts` holds the Zod schemas for requests, responses and errors. The API
  validates input with them and the web app validates every response with them.
- The web app is organized by feature (`api`, `hooks`, `model`, `components`). Pages compose
  features through their public `index.ts`.
- `npm run check:boundaries` parses imports and fails the build when a dependency points the
  wrong way.

## Documentation

| Document                                       | Contents                                                      |
| ---------------------------------------------- | ------------------------------------------------------------- |
| [Getting started](docs/getting-started.md)     | Requirements, setup, environment, commands, troubleshooting   |
| [Product requirements](docs/prd.md)            | Problem, users, scope, requirements, acceptance criteria      |
| [Business rules](docs/business-rules.md)       | Search, filters, sorting, pagination, display and open houses |
| [Architecture](docs/architecture.md)           | Layers, request pipeline, errors, security, frontend design   |
| [Project structure](docs/project-structure.md) | Folder map, module anatomy, naming, where to change what      |
| [API reference](docs/api.md)                   | Endpoints, parameters, responses and error codes              |
| [Database (ERD)](docs/erd.md)                  | Tables, columns, constraints, indexes and migrations          |
| [UI guidelines](docs/ui-guidelines.md)         | Visual design, responsive layouts and accessibility           |
| [Testing](docs/testing.md)                     | Test layers, coverage gates and CI                            |
| [Deployment](docs/deployment.md)               | Neon and Vercel setup, environment variables, smoke tests     |
| [Data import](docs/data-import.md)             | Dataset, dump import and normalization rules                  |
| [Decisions](docs/decisions.md)                 | Architecture decision records                                 |
