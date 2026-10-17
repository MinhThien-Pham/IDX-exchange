# Business rules

This document defines how search, filtering, sorting, pagination and listing presentation behave.
The rules are enforced in three places: shared Zod contracts (`packages/contracts`), API use
cases and repositories (`backend/src/modules`), and pure frontend models
(`frontend/src/features/*/model`). When a rule appears in more than one place, the API is
authoritative and the browser repeats it only to give earlier feedback.

## 1. Applied search and drafts

### The URL is the applied search

Location, refinements, sort order and page are stored in the page URL, for example
`/?city=Pasadena&beds=3&sortBy=price&sortOrder=ASC`. A refresh, a shared link or browser
Back/Forward therefore reproduces the same results. No search state is stored on the server.

- Parameters with empty values are omitted from the URL.
- A URL with an invalid value (for example a negative price or `minPrice` above `maxPrice`)
  shows an **Invalid search** state with a reset action. No request is sent.
- The browser ignores parameters it does not know. A known parameter repeated in the URL is
  invalid. The API is stricter and rejects unknown, repeated or empty parameters with `400`.

### Drafts are applied explicitly

Typing does not replace the results. Edits stay in a local draft until the visitor applies them.

| Layout  | How the draft is applied                                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop | **Search** or Enter applies the location. **Apply** in the sidebar applies refinements. Changing the sort applies immediately and keeps any unsent location text. |
| Phone   | **Show homes** applies location, refinements and sort together. **Cancel** closes the sheet and discards its draft.                                               |

Applying a new search or a new sort always returns to page 1.

## 2. Location

### One field for city or ZIP

The **City or ZIP code** field accepts either value:

| Input (trimmed)         | Interpreted as | Matching                                          |
| ----------------------- | -------------- | ------------------------------------------------- |
| `12345` or `12345-6789` | `zipcode`      | Exact text match. Leading zeros are kept.         |
| Anything else           | `city`         | Exact match, ignoring case and surrounding spaces |

Location is not an address or radius search. A shared URL may carry both `city` and `zipcode`;
both then apply.

### City suggestions

- Suggestions open while the field holds text that does not look like a ZIP code
  (`^\d{1,5}(-\d{0,4})?$`).
- The request is sent 150 ms after typing stops. Results are cached per prefix, and an
  out-of-date response never replaces suggestions for a newer prefix.
- The API returns at most **8** distinct city names that start with the prefix, compared without
  case. `%`, `_` and `\` are matched literally. Results are sorted alphabetically.
- Suggestions come from the whole inventory and ignore the other filters, so a suggested city
  can return zero results in combination with them.
- Choosing a suggestion fills the draft only. The search is applied by Search or Show homes.
- If suggestions fail to load, the field shows a short notice and manual search still works.

## 3. Refinements

| Filter      | Parameter              | Rule                                                                                |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Price range | `minPrice`, `maxPrice` | Inclusive, USD, 0 to 999,999,999,999. `minPrice` must not exceed `maxPrice`.        |
| Bedrooms    | `beds`                 | Minimum count. Integer 0 to 100. UI choices: Any, 1+ to 5+.                         |
| Bathrooms   | `baths`                | Minimum count, decimals allowed. 0 to 100. UI choices: Any, 1+, 1.5+, 2+, 2.5+, 3+. |
| Home type   | `homeType`             | One canonical key from the home-types endpoint (see section 4).                     |

- Filters combine with AND.
- A listing whose value is unknown (`null`) does not match a filter on that value. For example,
  a listing without a price is excluded when any price bound is set.
- `minPrice > maxPrice` is rejected by the browser form and by the API
  (`INVALID_SEARCH_RANGE`).

### Applied filter chips

Every applied filter appears as a chip above the results. Removing a chip clears only that filter
and returns to page 1. **Clear all** resets the whole search to its defaults: no location, no
refinements, newest listed first, page 1. **Reset filters** clears price, rooms and home type
but keeps the location and sort. On desktop it applies at once; in the phone sheet it resets the
draft, which **Show homes** then applies.

## 4. Home type classification

Source listings carry a free-text property subtype such as `SingleFamilyResidence`,
`Single Family Residence` or `Condominium`. The listing domain
(`backend/src/modules/listings/domain/home-type.ts`) maps it to one canonical home type
`{ value, label }`. The same mapping drives the card badges, the filter choices and the filter
query.

**Normalization.** The subtype is lowercased and every character other than `a-z` and `0-9` is
removed. `Single Family Residence` and `SingleFamilyResidence` both become
`singlefamilyresidence`.

| Value                  | Label                | Normalized source spellings                                        |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| `single-family`        | Single-family        | `singlefamily`, `singlefamilyresidence`, `singlefamilyresidential` |
| `condo`                | Condo                | `condo`, `condominium`                                             |
| `townhouse`            | Townhouse            | `townhouse`, `townhome`                                            |
| `manufactured-on-land` | Manufactured on land | `manufacturedonland`                                               |
| `manufactured-home`    | Manufactured home    | `manufacturedhome`                                                 |
| `mobile-home`          | Mobile home          | `mobilehome`                                                       |
| `co-op`                | Co-op                | `stockcooperative`                                                 |
| `fourplex`             | Fourplex             | `quadruplex`, `fourplex`                                           |
| `mixed-use`            | Mixed-use            | `mixeduse`                                                         |
| `boat-slip`            | Boat slip            | `boatslip`                                                         |
| `own-your-own`         | Own your own         | `ownyourown`                                                       |
| `co-ownership`         | Co-ownership         | `coownership`                                                      |
| `deeded-parking`       | Deeded parking       | `deededparking`                                                    |

- **No type:** a missing subtype or a generic one (`residential`, `other`, `unknown`, `na`)
  produces `homeType: null`. The card shows no badge; no type is inferred from price, rooms or
  photos.
- **Unlisted subtypes:** any other value keeps its normalized text as the key and a readable
  label (camel case split into words). It still works as a filter choice.
- **Filter choices** come from the distinct subtypes in the whole inventory. Equivalent spellings
  appear once. Single-family, Condo and Townhouse are listed first, then the rest alphabetically.
- **Filtering** by a key matches every source spelling of that key. The stored subtype is never
  rewritten.

## 5. Sorting

| Option                  | `sortBy`     | `sortOrder` |
| ----------------------- | ------------ | ----------- |
| Newest listed (default) | `listedAt`   | `DESC`      |
| Oldest listed           | `listedAt`   | `ASC`       |
| Price: low to high      | `price`      | `ASC`       |
| Price: high to low      | `price`      | `DESC`      |
| Largest first           | `squareFeet` | `DESC`      |
| Smallest first          | `squareFeet` | `ASC`       |
| Most bedrooms           | `bedrooms`   | `DESC`      |
| Fewest bedrooms         | `bedrooms`   | `ASC`       |

Listings without a value for the sort field are placed last in both directions. Ties are broken
by the internal listing ID in ascending order, so every page has a stable, repeatable order.

## 6. Pagination and result counts

- Page size is **20** (API `limit` default; the API accepts 1 to 100). `offset` is capped at
  1,000,000.
- The total and the page are read in one read-only, repeatable-read transaction, so they agree
  even while an import is writing.
- The results heading shows the API total (for example "1,248 homes") and the applied location
  ("in Pasadena", "in ZIP 02108" or "All locations"). While a new search loads, it shows
  "Finding homes…" instead of the previous total.
- Desktop shows "Showing 21–40 of 1,248" beside the pagination. Phones show the current page
  and page count in the bottom bar.
- Pagination is disabled while results load, after a failed request and when no results exist.
- A page beyond the last result shows **No homes on this page** with **Return to first page**.

## 7. Listing presentation

### Missing values

Missing data is shown as missing, never as zero or as an invented value.

| Field                         | When missing                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Price                         | "Price unavailable"                                                                   |
| Beds, baths, area, year built | The fact is omitted. The detail page notes "Some property details were not provided." |
| Address                       | "Address unavailable"                                                                 |
| Listing date                  | "Listing date unavailable" on cards; omitted from the detail facts                    |
| Location line                 | "Location unavailable" when city, state and ZIP are all empty                         |
| Description                   | "No property description was provided."                                               |
| Photos                        | A labeled placeholder. An image that fails to load also falls back to it.             |
| Coordinates                   | No map. With coordinates and no Maps key, a "Get directions" link is shown.           |

### Formatting

- Prices are US dollars without cents, for example `$750,000`.
- **Price per square foot** is shown only when both price and living area are greater than zero.
- Listing dates are calendar dates (`Jan 15, 2026`) and are not converted between time zones.
- Lot size is shown in acres. The source MLS number is shown as **Listing ID**.

### Listing identity

Detail URLs use the internal UUID (`/property/{uuid}`), not the MLS number. A malformed ID and an
ID that does not exist both show **This listing is unavailable** with a way back to the results.

## 8. Open houses

- Each open house has a calendar date, optional local start and end times, and the IANA time
  zone of the property (for example `America/Los_Angeles`). Times are wall-clock times in that
  zone.
- Events are listed by date, then start time.
- The status is computed in the event's own time zone, not the visitor's:

  | Condition                                                   | Label                          |
  | ----------------------------------------------------------- | ------------------------------ |
  | Date before today, or today with an end time already passed | Past event · Recorded schedule |
  | Date is today                                               | Today                          |
  | Date after today                                            | Upcoming                       |
  | Time zone cannot be read                                    | Recorded schedule              |

- Past events stay visible because they are part of the recorded data. An existing listing with no
  events shows "No open houses listed." A listing that does not exist returns `404`.

## 9. Data boundaries

- The public API is read-only. Only the seed and import scripts write data.
- `raw_data` holds the original source record for diagnostics and is never returned by the API.
- The dataset is a historical snapshot. The interface uses ordinary listing language; the
  snapshot's limits are stated in the [README](../README.md) and the [PRD](prd.md).
