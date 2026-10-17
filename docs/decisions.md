# Architecture decisions

Each record states the context, the decision and its consequences. Records are added, not
rewritten; a reversed decision gets a new record that supersedes the old one.

## ADR-001: TypeScript PERN monorepo

**Context.** The web app and the API exchange the same request and response shapes, and the data
is relational with typed numeric filters.

**Decision.** A TypeScript monorepo with npm workspaces: React + Vite, Express 5, PostgreSQL, and
a shared `@idx/contracts` package of Zod schemas.

**Consequences.**

- One schema defines each request and response, validates it at runtime on both sides, and
  provides its static type.
- PostgreSQL brings `numeric` prices, generated columns, expression indexes, check constraints and
  transactional reads used by search.
- Server-side rendering (Next.js) and a dependency-injection framework (NestJS) were not adopted.
  The search UI is interactive and URL-driven, and plain constructor injection is enough for two
  modules. Search-engine indexing of listing pages would be a reason to revisit rendering.

## ADR-002: Modular monolith with Clean Architecture layers

**Context.** Listings and open houses are separate business areas, but the traffic and team size
do not justify separate services.

**Decision.** One API with a module per business area. Each module has `domain`, `application`,
`infrastructure` and `presentation` layers. Use cases depend on repository interfaces; modules
communicate only through injected ports.

**Consequences.**

- Use cases are tested with in-memory repositories; HTTP tests never open a database connection.
- Simple read models stay as TypeScript interfaces. Value objects, base entities or generic
  repositories are not introduced until a rule needs them.
- An automated import check (`npm run check:boundaries`) keeps the dependency direction from
  eroding.

## ADR-003: Business errors carry a kind, not a status

**Context.** The HTTP error handler must choose a status code without depending on
module-specific error codes.

**Decision.** `ApplicationError` takes a kind (`not-found` or `invalid-input`) plus a module-owned
code. The error handler maps kinds to status codes. Controllers rely on `asyncHandler` and contain
no `try/catch`.

**Consequences.** New business errors need no change to shared HTTP code. New kinds (for example
`conflict`) require one entry in the status map.

## ADR-004: Internal UUIDs in public URLs

**Context.** Source MLS numbers are only unique within one source and may be reused across imports
from different sources.

**Decision.** Each record gets a generated UUID. `(source, external_id)` is the unique source
identity used by imports. Public routes accept UUIDs only; the MLS number is exposed as
`externalId`.

**Consequences.** Re-imports keep the same UUIDs, so links stay stable. Malformed IDs are rejected
by the contract with `400` before any query runs.

## ADR-005: The URL is the applied search

**Context.** Searches must survive refresh, history navigation and sharing.

**Decision.** Location, refinements, sort and page live in URL parameters. Form drafts stay local
until applied. TanStack Query owns server state. No global state library is used.

**Consequences.** Any search is reproducible from its URL. The browser validates URL parameters
with the same contract as the API and shows a recoverable state for invalid links.

## ADR-006: Shared home-type classification

**Context.** Source subtypes use several spellings for the same home type, and some are generic
(`Residential`) or missing.

**Decision.** One domain function maps a source subtype to a canonical `{ value, label }`. Badges,
filter choices and filter queries all use it. An expression index on the normalized subtype
supports the filter. Stored subtypes are not rewritten.

**Consequences.** Changing a grouping is a one-file change. Missing or generic subtypes produce no
badge rather than an inferred type.

## ADR-007: Separate web and API deployments on Vercel, PostgreSQL on Neon

**Context.** The project needs low-cost hosting with a managed PostgreSQL database.

**Decision.** Two Vercel projects (static Vite build and an Express function) built from the same
repository, and a Neon database. Runtime uses Neon's pooled URL; migrations may use the direct
URL. Migrations and imports run as operator commands, never during builds or requests.

**Consequences.** Only the API project holds credentials. CORS must list the web origin exactly.
Free-tier cold starts and quotas are accepted constraints.

## ADR-008: Coverage gates and real-database tests

**Context.** SQL behavior needs a real database, and layout and focus behavior need a real
browser.

**Decision.** CI runs unit, HTTP and component tests with coverage thresholds, PostgreSQL
integration tests against a real database, and Playwright tests against the built app. Thresholds:
API 90% statements, functions and lines, 80% branches; web 80% statements and lines, 70% branches
and functions.

**Consequences.** Coverage gates protect critical flows from regressions. Thresholds are not
lowered to make a failing build pass.

## ADR-009: Dependency overrides

**Context.** Jest's `@istanbuljs/load-nyc-config` pulled a `js-yaml` 3 chain
(`argparse`, `sprintf-js`) with a security advisory.

**Decision.** A scoped npm override selects `js-yaml` 4 for that package only. Its `load` API is
the one the consumer calls.

**Consequences.** The advisory is removed without downgrading Jest. Coverage runs and clean
installs validate the override; it is reassessed when upstream packages update.
