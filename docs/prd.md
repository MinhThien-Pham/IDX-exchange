# Product requirements

|             |                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| **Product** | IDX Exchange: residential property search                                                                           |
| **Context** | IDX Exchange Software Development Engineer Internship, Summer 2026; individual project                              |
| **Type**    | Public, read-only web application with a versioned JSON API                                                         |
| **Data**    | Historical MLS (RETS) snapshot exported September 2026: about 55,000 residential listings, almost all in California |

## 1. Problem

The internship supplied MLS listing data as SQL dumps of tables exported from a RETS feed. In that form
the data cannot be used to look for a home:

1. **It cannot be searched by a visitor.** Finding three-bedroom homes in one city under a budget
   requires writing SQL against columns such as `L_SystemPrice` and `LM_Int2_3`.
2. **Values are inconsistent.** The same home type is spelled several ways
   (`SingleFamilyResidence`, `Single Family Residence`), and some prices, dates, coordinates and
   room counts are missing or invalid.
3. **A listing cannot be understood at a glance.** Photos, facts, location and open houses are
   spread across tables and raw fields.

IDX Exchange turns this export into a property browser: one place to narrow the inventory, compare
results and inspect a single listing.

## 2. Goals

| #   | Goal                                                    | Measure                                                                                  |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| G1  | Narrow the inventory to relevant homes                  | Location, price, room and home-type filters combine in one applied search                |
| G2  | Understand one property                                 | A detail page shows photos, key facts, description, location and open houses             |
| G3  | Searches are reproducible                               | Refresh, Back/Forward and shared links restore the same filters, sort and page           |
| G4  | Data is presented truthfully                            | Missing values are never shown as zero or invented; past open houses are labeled as past |
| G5  | Works on phones and desktops, with assistive technology | Layouts from 320 px wide; keyboard operation; automated WCAG 2.1 A/AA checks pass        |
| G6  | The codebase is maintainable                            | Layer boundaries, contracts and coverage thresholds are enforced in CI                   |

### Non-goals

- User accounts, saved homes, saved searches or alerts.
- Contacting agents, booking viewings, making offers or any transaction.
- Valuations, market trends or investment analysis.
- Map-based or radius search, and address search.
- Live MLS synchronization. The data is a one-time import of a historical export.
- Rental-specific search or lease information.
- An administration interface for editing listings.

## 3. Users

These audiences are derived from the product scope.

| User                                 | Need                                                 | Served by                                                   |
| ------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------- |
| Person exploring a home purchase     | Find homes within a budget and size in a chosen area | Filters, sorting, photos, facts, open houses                |
| Person researching a specific area   | See what exists in a city or ZIP code                | City suggestions, ZIP search, result totals, shareable URLs |
| Real estate professional or investor | Look up individual listing information               | Same search and detail pages; no professional tooling       |

## 4. Features

### A. Search

- One **City or ZIP code** field. ZIP and ZIP+4 values search by ZIP; other text searches by city.
- City suggestions from the inventory after the first typed character.
- Price range, minimum bedrooms, minimum bathrooms, and home type.
- Explicit submission: typing never replaces the results until the search is applied.

### B. Results

- Result total and applied location in the heading.
- Eight sort orders, 20 results per page, stable ordering.
- Property cards with photo, price, price per square foot, facts, address and home-type badge.
- Removable chips for each applied filter, plus Clear all.
- Empty, invalid-search and failed-request states with recovery actions.

### C. Listing detail

- Price, price per square foot, address and location line.
- Photo gallery with numeric counter, horizontal scrolling, keyboard control and a full-screen
  viewer.
- Bedrooms, bathrooms, living area, year built, description and a property details list.
- Embedded map when a Google Maps key is configured; otherwise a directions link.
- Return to the same search, page and scroll position.

### D. Open houses

- Recorded open houses for the listing, with date, local time range and time zone.
- Status (Past, Today, Upcoming) computed in the property's time zone.

### E. API and data

- Read-only versioned API (`/api/v1`) with an OpenAPI document and health endpoints.
- Migrations, a demo seed, and an importer for the MLS dump files.

## 5. Functional requirements

Detailed rules are in [Business rules](business-rules.md); section numbers are given in brackets.

| ID    | Requirement                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| FR-1  | The applied search is stored in the URL and restored on refresh, history navigation and shared links. [1]  |
| FR-2  | Location, refinement and sort edits apply only on Search, Apply, a desktop sort change, or Show homes. [1] |
| FR-3  | A five-digit ZIP or ZIP+4 searches by exact ZIP; other text searches by exact city, ignoring case. [2]     |
| FR-4  | City suggestions return at most 8 inventory cities for a literal prefix and never submit a search. [2]     |
| FR-5  | Price bounds are inclusive and `minPrice` must not exceed `maxPrice`. Room filters are minimums. [3]       |
| FR-6  | Home types group equivalent source spellings under one key used by badges, choices and filtering. [4]      |
| FR-7  | Results support eight sort orders with nulls last and a stable tie-breaker. [5]                            |
| FR-8  | Results are paginated 20 per page; the total and page come from one consistent read. [6]                   |
| FR-9  | Changing the search or the sort returns to page 1; each filter chip removes only its filter. [1, 3]        |
| FR-10 | Missing values are displayed as unavailable or omitted, never as zero. [7]                                 |
| FR-11 | Price per square foot appears only when price and living area are both positive. [7]                       |
| FR-12 | Detail pages are addressed by internal UUID; malformed or unknown IDs show an unavailable state. [7]       |
| FR-13 | Open houses are ordered by date and time; status is computed in the event's time zone. [8]                 |
| FR-14 | The API rejects unknown, repeated, empty and out-of-range parameters with a structured `400` error.        |
| FR-15 | The API never returns the raw source record (`raw_data`).                                                  |

## 6. Non-functional requirements

| Area            | Requirement                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Security        | Read-only HTTP API. Parameterized queries and an allowlisted sort column. CORS limited to configured origins. Database credentials only on the API; browser configuration contains only public values. |
| Error handling  | Errors use a stable `{ error: { code, message }, requestId }` shape. Unexpected errors never expose SQL, stack traces or credentials.                                                                  |
| Data integrity  | Database constraints reject negative counts, invalid coordinates and empty identities. Imports are idempotent upserts.                                                                                 |
| Responsiveness  | Usable from 320 px wide, in phone portrait and landscape, tablet and desktop, without horizontal page scroll.                                                                                          |
| Accessibility   | Full keyboard operation, visible focus, labeled controls, modal focus management, reduced-motion support. Automated axe checks for WCAG 2.1 A/AA run on results and dialogs in light and dark themes.  |
| Observability   | Each response carries an `X-Request-ID` that also appears in structured JSON logs. Logs exclude credentials, SQL and query parameters.                                                                 |
| Maintainability | Enforced dependency direction between layers and features; shared request/response contracts; CI coverage thresholds.                                                                                  |

## 7. Acceptance criteria (main flows)

| Flow              | Criteria                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search and refine | Given the results page, when a visitor types "Pas", chooses "Pasadena", sets 3+ beds and applies, then the URL, heading, chips and results reflect only that search, starting on page 1. |
| Sort and page     | When the visitor changes the sort and moves to page 2, the order is stable and Back returns to page 1 with the same sort.                                                                |
| Detail and return | When the visitor opens a listing and returns, the same search, page and scroll position are restored.                                                                                    |
| Direct link       | When a detail URL is opened directly or refreshed, the listing loads. An unknown or malformed ID shows the unavailable state.                                                            |
| Invalid search    | When the URL contains `minPrice` greater than `maxPrice`, no request is sent and a reset action is offered.                                                                              |
| Empty and failure | Zero results keep the chips and offer Edit search. A failed request keeps the search and offers Try again.                                                                               |
| Phone             | On a phone, filters open in a bottom sheet; Cancel leaves the applied search unchanged; pagination and Back to listings are in the bottom bar.                                           |
| Accessibility     | Results, the filter dialog and the photo dialog pass the automated WCAG 2.1 A/AA checks in both themes.                                                                                  |
| Deployment        | The deployed web app loads results from the deployed API; detail refresh works; `/api/health` reports the database as connected.                                                         |

## 8. Scope and design trade-offs

These choices are deliberate and keep the product small, predictable and inexpensive to run.

- **Historical snapshot.** The inventory is a one-time import. It favors a stable, reproducible
  dataset over a live feed; prices, availability and open-house dates reflect the export, and
  recorded open houses may already be in the past.
- **Source-hosted photos.** Photos are referenced, not copied, so the service stores no media.
  Source links can expire; cards and the gallery skip photos that fail to load, and a placeholder
  appears only when none of a listing's photos can be shown.
- **Exact location matching.** City and ZIP match exactly and are completed through suggestions.
  This keeps queries index-backed and results explainable; fuzzy, address and radius search are
  out of scope.
- **Offset pagination.** Pages use a bounded offset (up to 1,000,000) with a stable sort and a
  consistent count, which supports direct page links and shareable URLs.
- **Free-tier hosting.** Idle compute may suspend, so the first request after a quiet period can
  be slower.
- **Single locale.** English, US dollars and US address formats.
