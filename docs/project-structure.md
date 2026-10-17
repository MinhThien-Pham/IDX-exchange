# Project structure

## Repository root

```
IDX-Exchange/
├── backend/                 @idx/api: Express API, migrations, scripts, tests
├── frontend/                @idx/web: React + Vite web app
├── packages/contracts/      @idx/contracts: shared Zod schemas and types
├── e2e/                     Playwright browser tests and their database setup
├── scripts/                 architecture boundary checker and its tests
├── docs/                    this documentation
├── .github/                 CI workflow and pull request template
├── package.json             npm workspaces and root commands
├── tsconfig.base.json       shared compiler options (strict)
├── tsconfig.tools.json      type check for root scripts and configs
├── eslint.config.js         ESLint flat config
├── playwright.config.ts     browser test servers and projects
└── .nvmrc                   Node.js version (24)
```

Run every command from the root. One `package-lock.json` covers all workspaces.

## `backend/`

```
backend/
├── src/
│   ├── app.ts                    composition root; default export for Vercel
│   ├── create-app.ts             HTTP app factory with injected dependencies
│   ├── server.ts                 local listener and graceful shutdown
│   ├── modules/
│   │   ├── listings/
│   │   └── open-houses/
│   ├── platform/
│   │   ├── config/env.ts         environment validation
│   │   ├── db/                   client, schema, migration runner, UUID guard
│   │   ├── http/                 async handler, errors, validation, request context, OpenAPI
│   │   └── logging/logger.ts     structured JSON logger
│   └── shared/errors/            ApplicationError
├── db/migrations/                numbered SQL migrations
├── scripts/                      migrate, seed, import-mls and their helpers
├── tests/                        API, use case, environment and PostgreSQL integration tests
└── vercel.json                   API project build settings
```

### Module anatomy

Every backend module has the same shape. `listings` as the example:

```
modules/listings/
├── domain/
│   ├── listing.ts                     Listing type
│   └── home-type.ts                   home-type classification rules
├── application/
│   ├── ports/listing-repository.ts    ListingRepository interface, ListingSearch types
│   └── use-cases/
│       ├── search-listings.ts         SearchListings
│       ├── get-listing-details.ts     GetListingDetails
│       ├── get-home-types.ts          GetHomeTypes
│       └── suggest-cities.ts          SuggestCities
├── infrastructure/
│   └── postgres-listing-repository.ts PostgresListingRepository implements ListingRepository
├── presentation/
│   ├── listing-routes.ts              paths and request validation
│   └── listing-controller.ts          one handler per use case
└── index.ts                           createListingsModule(repository) → { router }
```

## `frontend/`

```
frontend/src/
├── main.tsx                 entry; loads global CSS and renders App
├── index.css                design tokens, base styles, shared component styles
├── app/                     App (routes), AppLayout (header), providers (QueryClient)
├── pages/                   ListingsPage, PropertyDetailPage
├── features/
│   ├── listings/
│   │   ├── api/             listings.api.ts, search-options.api.ts
│   │   ├── hooks/           useListingSearch, useListings, useSearchOptions
│   │   ├── model/           search-query.ts, search-form.ts
│   │   ├── components/      views, cards, filters, gallery, map (+ co-located CSS and tests)
│   │   └── index.ts         public exports: ListingsView, PropertyDetailView
│   └── open-houses/
│       ├── api/  hooks/  model/  components/
│       └── index.ts         public export: OpenHouses
├── shared/
│   ├── api/client.ts        fetch wrapper, ApiError, response validation
│   ├── config.ts            validated VITE_* configuration
│   ├── hooks/               useDebouncedValue, useMediaQuery, usePageScroll
│   ├── ui/                  ErrorBoundary, Modal, Pagination, PropertyImage, ResultState, ThemeToggle
│   └── utils/               formatting, query-string
├── assets/                  bundled images
└── test/                    Jest setup, fixtures and mocks
```

## `packages/contracts/`

`src/index.ts` exports the request schemas (`searchListingsSchema`, `listingParamsSchema`,
`citySuggestionsQuerySchema`), response schemas (`listingSchema`, `listingsResponseSchema`,
`openHousesResponseSchema`, `homeTypesResponseSchema`, `citySuggestionsResponseSchema`), the
error schema, and the inferred TypeScript types. The package is built to `dist/` before the API or
the web app builds.

## Naming conventions

| Item                        | Convention                                                 | Example                           |
| --------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Backend files               | kebab-case                                                 | `get-listing-details.ts`          |
| Use case classes            | Verb phrase, one `execute` method                          | `GetListingDetails.execute(id)`   |
| Repository ports / adapters | `<Entity>Repository` / `Postgres<Entity>Repository`        | `PostgresListingRepository`       |
| Module factories            | `create<Module>Module`                                     | `createListingsModule`            |
| React components            | PascalCase file and default export                         | `PropertyCard.tsx`                |
| Hooks                       | `use` prefix, camelCase                                    | `useListingSearch.ts`             |
| Feature API adapters        | `<area>.api.ts`, `fetch*` functions                        | `fetchListings`                   |
| Component styles            | Same name as the component                                 | `PropertyCard.css`                |
| Tests                       | `*.test.ts(x)` beside the code (web) or in `backend/tests` | `search-form.test.ts`             |
| Migrations                  | `NNNN_description.sql`                                     | `0002_listing_search_options.sql` |
| Error codes                 | UPPER_SNAKE_CASE                                           | `LISTING_NOT_FOUND`               |

## Where to change what

| Change                               | Files                                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a search filter                  | `packages/contracts` schema → `ListingSearch` port → repository condition → `search-form.ts` and `PropertyFilters` → chip label in `AppliedFilters` → [API reference](api.md) |
| Add a sort option                    | `sortFields` in contracts → `sortColumns` in the repository → `sortOptions` in `search-form.ts`                                                                               |
| Change home-type grouping            | `modules/listings/domain/home-type.ts` (badges, choices and filtering all follow)                                                                                             |
| Add a business error                 | Throw `ApplicationError(kind, code, message)` in the use case; document the code in [API reference](api.md)                                                                   |
| Add an endpoint                      | Contract schema → use case → controller handler → route → `openapi.ts` → API test                                                                                             |
| Add a column                         | New numbered migration → `platform/db/schema.ts` → domain type → repository selection/mapper → contract → [ERD](erd.md)                                                       |
| Add a backend module                 | `modules/<name>/{domain,application,infrastructure,presentation}` + `index.ts`; wire it in `app.ts` and `create-app.ts`                                                       |
| Add a frontend feature               | `features/<name>/{api,hooks,model,components}` + `index.ts`; compose it from a page                                                                                           |
| Change display formatting            | `shared/utils/formatting.ts`                                                                                                                                                  |
| Change colors, spacing or typography | Tokens at the top of `frontend/src/index.css`; see [UI guidelines](ui-guidelines.md)                                                                                          |
| Change dependency rules              | `scripts/architecture-rules.mjs` and its test file                                                                                                                            |
