# IDX Exchange — Product Requirements

## Product story

IDX Exchange helps people explore residential listings and understand an individual property before deciding what to investigate next. A person can narrow the available inventory by location, budget, bedrooms, and bathrooms, browse photos, inspect property facts and location, and review recorded open house information.

The owner is building a personal learning and portfolio project. The public Vercel application should expose the same migrated listing dataset and behavior available locally. A useful, readable property browser is the product goal; the project also demonstrates a maintainable full-stack implementation.

## Audience and evidence

The owner identified home buyers and people researching residential real estate as the intended audience. The following priorities are inferred from the implemented capabilities, rather than interviews or measured user behavior:

| Audience                                                  | Useful existing capabilities                                                    | Product boundary                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| People exploring a home purchase                          | Budget and room filters, photos, property facts, location, open houses          | The application does not handle an offer, transaction, or viewing appointment.                                  |
| People researching individual listings or local inventory | City/ZIP search, price and size sorting, listing details, shareable search URLs | This is listing exploration, not a market trend or valuation platform.                                          |
| Investors and real estate professionals                   | The same inventory and individual listing information                           | There are no yield calculations, investment recommendations, client management, or professional workflow tools. |

The current product does not establish a rental-specific audience or rental search workflow. It has no dedicated rental-period or lease workflow in its public contracts.

## Dataset and presentation

A read-only scan of the local `rets_property.sql` dump on October 17, 2026 found 54,438 source rows, including 54,349 with state `CA`. All rows use the source class `Residential`. The largest city groups are Los Angeles, San Diego, and San Jose. These are source snapshot counts, not a promise about the final number of successfully migrated public records.

The dump was generated on August 14, 2026. It contains historical listing dates and open house records. The product must not imply that imported inventory is a live feed, that a historic source status remains current, or that all recorded events are upcoming.

- UI language: English, matching the current application.
- Price: USD; area: square feet and acres, matching the public model and formatters.
- Geography: predominantly California; do not silently exclude other valid source locations.
- Publication target: the local listing dataset and linked open house records migrated to Neon, served through the public API. Private raw source payloads are not public API fields.
- The existing legacy importer reads `rets_property` and `rets_openhouse`. The separate `california_sold.sql` dump is not a public sales-history feature or part of that importer.
- Demo seed records support development and tests. They are not a substitute for the owner's intended public inventory.

## Existing scope

1. Search by exact city and ZIP, minimum/maximum price, minimum bedrooms, and minimum bathrooms.
2. Sort by listing date, price, square feet, or bedrooms, with ascending/descending order.
3. Move through result pages with stable ordering; preserve search state in the URL.
4. Open a listing's detail page and return to the previous search.
5. Inspect photos and use an accessible image gallery.
6. Read property facts and description, inspect location when coordinates are available, and review linked open house records.
7. Recover from invalid filters, empty results, unavailable records, and failed requests.

The redesign must preserve these behaviors. Do not add accounts, saved homes, saved searches, comparison tools, contact forms, appointment booking, maps of search results, valuation tools, or market analytics as part of this work.

## Primary journey

1. Arrive at the listing browser and understand which inventory is being shown.
2. Enter a city and/or ZIP and optionally narrow the budget and room requirements.
3. Review results, change sorting, or move to another page.
4. Open a listing and inspect its photos and key facts.
5. Review location and any open house records.
6. Return to the same search without rebuilding filters or losing the current page.

Shared links and direct refreshes must reproduce the appropriate search or detail view.

## Design requirements

- Minimal, calm visual design with clear information hierarchy and restrained use of color.
- Readable prices, addresses, facts, labels, and error messages at desktop and mobile sizes.
- Responsive layouts for desktop, tablet portrait, phone portrait, and phone landscape; no accidental horizontal scrolling.
- Touch-friendly controls and adequate spacing. On phones, pagination and the detail page's return action belong near the bottom for thumb access, regardless of handedness.
- Mobile filters may use a bottom sheet. Its apply/reset actions must remain easy to reach, and keyboard focus and dismissal must work correctly.
- Bottom controls must not obscure content, conflict with safe areas, or prevent use of the on-screen keyboard.
- No scroll-triggered fade/reveal effects, decorative parallax, or complex animation. Respect reduced-motion preferences for any necessary feedback.
- Preserve keyboard access, visible focus, meaningful labels, and usable contrast. Color alone must not communicate a state.
- Present meaningful missing-data, loading, empty, and error states; do not replace missing facts with invented values.

The name remains IDX Exchange. Use the owner-approved Pacific design, with its navy surfaces and peach-orange accents, the “A little closer to your next home” hero, and the reference card layout. Primary actions and selected controls use the same orange fill and navy foreground in both themes; do not switch these to red in light mode. Secondary actions may use neutral surfaces or a muted orange treatment. Include an explicit light/dark switch. On a medium desktop, Filters toggles a left sidebar and the card grid adapts from three to two columns. On a sufficiently wide desktop, keep the sidebar visible and omit its show/hide control. City and ZIP belong in the main search area, not duplicated in the desktop sidebar. Add bed, bath, and area icons beside the corresponding property facts. Theme changes must preserve the current view, filters, pagination, and browsing position.

On phones, keep Search & filters and pagination in the lower action bar. Omit the redundant Start exploring search panel above the results. Open the location, price, room, and sorting controls in a bottom sheet, with Cancel and Show homes at its lower edge. Show the applied sort order as secondary text beneath the results heading. On property detail pages, keep Back to listings and Photos together in the lower bar. Use a large photo carousel with horizontal touch scrolling and a numeric photo counter; omit dot indicators. Opening or closing the photo viewer preserves the detail page's reading position. In the focused phone photo viewer, keep the previous/next controls, counter, and Close photos action in the lower bar, with no arrow buttons over the photo. On desktop, put previous/next controls on the image and the close action in the upper toolbar; omit the lower photo toolbar. Support keyboard navigation and avoid automatic slide changes.

On desktop listings, combine the location input, Search button, Filters toggle, and Sort selector into one compact toolbar that stays visible while scrolling. Keep the open filter sidebar visible below that toolbar; the hero scrolls out of view. Use a single “City or ZIP code” input on desktop and in the phone sheet: the location is either a city name or a ZIP code. Show the magnifying glass and Search label when space allows; use a search icon with an accessible name when space is constrained. Changing sort order must preserve any location text the user is still editing.

Search uses explicit submission: typing a location does not immediately replace the results. On desktop, Search or Enter submits the location; applying the sidebar submits its filters. Desktop sorting applies immediately. On phones, Show homes applies the sheet's location, filters, and sorting together; Cancel leaves the applied search unchanged.

Show applied search filters as individually removable chips, with a Clear all action. Empty results should keep these chips and offer editing or broadening the search. Errors should preserve the applied search and provide a retry action. Loading, empty, and failed requests must not leave enabled pagination for unavailable result pages.

Cards and detail headers prioritize price, with price per square foot shown only when both price and a positive living area are available. Use native links for navigation to listings, and retain search filters, sorting, page, and reading position on return. On phone detail pages, place open house information immediately after the property facts; on desktop, use a side column. Keep the approved numeric gallery and device-specific controls.

Keep source provenance and snapshot limitations in the README. At the owner's request, omit the Data snapshot and Availability may have changed lines from the browsing interface. Use normal product language while retaining accurate listing facts and event dates. Recorded past open houses must be identified as past events. Do not invent upcoming-event badges or synthetic dates. Render only supplied property facts, use a useful missing-photo state, and provide recovery for unavailable or incorrect listing links. Cover loading, empty, error, missing-data, missing-photo, and unavailable-listing states with deterministic fixtures and API failure tests.

Replace the generic Explore the listings heading with two clear lines: a prominent API result total such as 1,248 homes, followed by All locations when no location is selected or in Pasadena / in ZIP 02108 for the applied location. Do not label the complete inventory as California, since valid records can have other locations. Omit the redundant California · US label in the top bar. Phone sorting remains a secondary caption, with controls in the lower search sheet. Update the heading from the applied search; show Finding homes while loading a new search rather than displaying a previous query's total under the new location. Desktop pagination includes Showing 1–20 of 1,248; phone uses current page / total pages. Page size remains the existing API default of 20.

## Acceptance criteria

| Area              | Completion evidence                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional parity | Existing searches, sorting, pagination, direct links, history, details, gallery, location, and open houses continue to work.                                  |
| Mobile ergonomics | Pagination, filters, and return actions can be reached near the lower edge; phone portrait and landscape layouts remain usable.                               |
| Accessibility     | Keyboard and focus checks, contrast checks, and automated accessibility checks cover the changed views and overlays.                                          |
| Data parity       | After migration, compare record counts and representative IDs, filters, details, and linked events against the intended local source. Document rejected rows. |
| Deployment        | Vercel frontend/API and Neon pass a public smoke test, including detail refresh, API connectivity, and CORS.                                                  |
| Quality           | CI passes; critical failure paths have meaningful tests and a measured coverage baseline.                                                                     |
| Documentation     | Public architecture, ERD/data dictionary, decisions, setup, and deployment documentation match the shipped implementation.                                    |

No conversion target or performance claim is defined without measurements. Initial success means a complete, reproducible browsing journey with verified data and deployment behavior.

## Implementation references

- [Public API contracts](../packages/contracts/src/index.ts)
- [Listing browser](../frontend/src/features/listings/components/ListingsView.tsx)
- [Detail view](../frontend/src/features/listings/components/PropertyDetailView.tsx)
- [Open house presentation](../frontend/src/features/open-houses/components/OpenHouses.tsx)
- [Display formatting](../frontend/src/shared/utils/formatting.ts)
- [PostgreSQL schema](../backend/src/platform/db/schema.ts)
- [Legacy importer](../backend/scripts/import-legacy.ts)

Private SQL dumps, local learning notes, generated previews, and work artifacts remain outside Git.
