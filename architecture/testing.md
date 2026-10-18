# Testing and verification

## Commands

| Command                 | Purpose                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`         | Lint, architecture boundaries, TypeScript, production builds and formatting.                                                    |
| `npm test`              | API/component tests; PostgreSQL tests run when `TEST_DATABASE_URL` is supplied.                                                 |
| `npm run verify`        | Local static/build checks and tests.                                                                                            |
| `npm run test:coverage` | Instrumented API/component tests and coverage thresholds. Supply an isolated `TEST_DATABASE_URL` for the full backend baseline. |
| `npm run verify:ci`     | Static/build checks and gated coverage, as used by CI with PostgreSQL.                                                          |
| `npm run test:e2e`      | Build and run Playwright against the real API and isolated `E2E_DATABASE_URL`.                                                  |

Both database URLs must name an isolated database with a distinct `test` segment, such as `idx_test`. Integration cleanup deletes only its synthetic test sources, but those guards do not make a production database suitable for tests. Browser setup upserts the demo seed. See the README for PowerShell examples.

## Coverage baseline

Measured during the UI implementation with PostgreSQL integration enabled:

| Suite           | Tests | Statements | Branches | Functions | Lines  |
| --------------- | ----- | ---------- | -------- | --------- | ------ |
| API and storage | 49    | 96.28%     | 88.63%   | 94.91%    | 96.90% |
| Frontend        | 50    | 82.56%     | 72.82%   | 73.00%    | 83.33% |

These are a dated implementation baseline, not a live badge. Current results are emitted by CI. Added source or branches can legitimately change them; do not lower a threshold merely to make a failing build pass.

The final local browser run passed all seven Playwright scenarios against the real API and PostgreSQL test database, using Microsoft Edge. CI runs the same scenarios with Chromium.

Frontend collection includes source components/hooks/models and excludes test utilities, tests and the DOM bootstrap. Backend collection excludes runtime startup and platform database setup; real database tests verify migration/repository behavior separately. JSX/SWC coverage alone cannot prove layout, focus, image behavior or contrast.

Coverage reports are generated under each workspace's ignored `coverage/` directory. API gates: 90% statements/functions/lines and 80% branches. Frontend gates: 80% statements/lines and 70% branches/functions. Initial limits leave measured headroom while protecting critical flows.

## What the tests protect

- API validation, safe error mapping, request IDs, CORS and async error forwarding.
- PostgreSQL constraints, foreign keys, normalized city lookup, exact ZIPs, fractional bathrooms, stable ordering, nulls-last behavior, pagination, idempotent imports and migrations.
- Explicit form submission, independent location drafts, sort composition, URL/history restoration, individual chip removal, stale-page recovery and phone cancellation.
- Accurate missing-data presentation, conditional price/sqft, broken-image fallbacks and timezone-aware open house labels.
- Gallery counters, bounded navigation, Escape, focus return, scroll preservation and browser keyboard access.
- Browser checks of sticky desktop controls, pinned/toggleable sidebars, phone portrait/landscape, 320px fit, direct detail refresh, failure recovery and light/dark appearance.
- Axe WCAG A/AA checks on light/dark results and modal states. Automated checks supplement visual and keyboard review; they do not replace physical-device usability testing.

## Reproducibility

CI starts PostgreSQL 17, installs with `npm ci`, runs `verify:ci`, installs Chromium and runs Playwright against the existing build. Microsoft Edge can be selected locally with `PLAYWRIGHT_CHANNEL=msedge`. Browser screenshots and traces are ignored outputs, not repository assets.

The small synthetic seed keeps tests deterministic and includes an out-of-California location and a missing-price record. It does not establish parity with the owner's intended imported inventory. Migration row counts, rejected rows and representative records require a separate data/deployment check.
