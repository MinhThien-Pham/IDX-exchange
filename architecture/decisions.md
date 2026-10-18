# Architecture decisions

## PERN with a modular monolith

**Decision:** React/Vite, Express, PostgreSQL and TypeScript in npm workspaces. Keep `listings` and `open-houses` as separate business modules inside one API.

The product is a read-only listing browser with relational event data, typed numeric filters, deterministic sorting and a reusable HTTP API. PostgreSQL provides constraints, joins and migration tooling. Explicit repository ports keep database implementation details outside use cases.

This personal project does not require Next.js rendering or NestJS dependency injection. The separate frontend/API deployment demonstrates HTTP boundaries directly. Search-engine rendering or a larger team could justify reassessing those choices later; they are not prerequisites for clean code.

## URL as the applied search

**Decision:** City/ZIP, refinements, sort and page live in URL parameters. Form drafts stay local until submitted; TanStack Query owns server state.

This makes refreshes, browser history and shared links reproducible without global state libraries. Desktop sort applies immediately, while a phone sheet applies all of its changes together. Existing URLs containing both city and ZIP retain both until the location is explicitly changed.

One combined location input classifies US ZIP and ZIP+4 strings without adding an autocomplete/geocoding service. It is not an address search. The results header uses the API total and does not infer the entire search geography from one page of cards.

## Small shared UI foundations

**Decision:** CSS design tokens, Lucide icons, a native dialog wrapper, and device-appropriate controls.

The approved Pacific appearance uses navy and peach-orange in light/dark modes. Primary actions and selected controls share one orange fill and navy foreground across themes and devices; secondary buttons use neutral surfaces or muted orange. Viewport layout determines whether controls use a sidebar or lower sheet/dock; short coarse-pointer landscapes also receive the compact controls. At wide desktop sizes the sidebar is pinned; medium desktop layouts can switch between two and three card columns.

Native links retain expected browser navigation. The dialog wrapper supplements native modality with a bounded Tab cycle, focus return and scroll locking. Gallery images use native horizontal scroll snapping, numeric counters and explicit buttons. There are no decorative motion libraries, accounts, favorites, or extra product services.

## Neon and two Vercel projects

**Decision:** Build frontend and API separately from the monorepo, with PostgreSQL on Neon.

Database credentials stay on the API. Browser configuration contains only public origins and an optional restricted Maps Embed key. Use Neon pooled runtime connections, and run migrations explicitly with suitable deployment credentials. SQL import runs locally rather than inside a serverless request.

Free-tier quotas, source-image availability, connection limits and cold starts remain operational constraints. The README describes setup and validation; a deployment is only complete after public smoke tests and intended-data reconciliation.

## Coverage and dependency maintenance

**Decision:** Gate measured coverage in CI and retain real PostgreSQL/browser tests alongside component tests.

The frontend gate is 80% lines/statements and 70% branches/functions. The backend gate is 90% lines/statements/functions and 80% branches. These leave modest headroom below the measured baseline; coverage is a regression signal rather than a claim of complete correctness.

Jest's `@istanbuljs/load-nyc-config` used a transitive js-yaml 3/argparse/sprintf-js chain with an advisory. A scoped override selects js-yaml 4, whose `load` API is the API this consumer uses. This removes the vulnerable chain without downgrading Jest. Coverage execution and clean dependency installs validate the resolution. Reassess the override when upstream dependencies change.
