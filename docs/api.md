# API reference

Base path: `/api/v1`. All endpoints are read-only `GET` requests that return JSON. The runtime
OpenAPI 3.1 document is served at `GET /api/openapi.json`; it is generated from the same Zod
contracts in [`packages/contracts`](../packages/contracts/src/index.ts) that the API and the web
app use.

## Endpoints

| Method | Path                                 | Purpose                                   |
| ------ | ------------------------------------ | ----------------------------------------- |
| GET    | `/api/health/live`                   | Process liveness; no database access      |
| GET    | `/api/health`                        | Readiness; checks the database connection |
| GET    | `/api/openapi.json`                  | OpenAPI document                          |
| GET    | `/api/v1/listings`                   | Search, sort and paginate listings        |
| GET    | `/api/v1/listings/home-types`        | Home types available in the inventory     |
| GET    | `/api/v1/listings/cities?q={prefix}` | City names that start with a prefix       |
| GET    | `/api/v1/listings/{id}`              | One listing by internal UUID              |
| GET    | `/api/v1/listings/{id}/openhouses`   | Open houses for one listing               |

## Conventions

- **Strict parameters.** Unknown, repeated or empty query parameters return `400`.
- **IDs.** `{id}` is the internal UUID returned by search. The MLS number is the `externalId`
  field and is not accepted as a path ID.
- **Numbers.** Prices are US dollars. `null` means the source did not provide a value.
- **Dates and times.** Dates are `YYYY-MM-DD`. Open-house times are local `HH:MM:SS` wall-clock
  times accompanied by an IANA `timeZone`.
- **Request IDs.** Every response has an `X-Request-ID` header. Error bodies repeat it as
  `requestId`; it matches the server log entry for that request.
- **CORS.** Browsers may call the API only from origins listed in `FRONTEND_ORIGINS`.

## Search listings

`GET /api/v1/listings`

| Parameter              | Type and range                                | Default    | Meaning                                          |
| ---------------------- | --------------------------------------------- | ---------- | ------------------------------------------------ |
| `city`                 | string, 1–100 characters                      | —          | Exact city, ignoring case and surrounding spaces |
| `zipcode`              | string, 1–20 characters                       | —          | Exact ZIP text; leading zeros preserved          |
| `minPrice`, `maxPrice` | number, 0–999,999,999,999                     | —          | Inclusive bounds; `minPrice` ≤ `maxPrice`        |
| `beds`                 | integer, 0–100                                | —          | Minimum bedrooms                                 |
| `baths`                | number, 0–100                                 | —          | Minimum bathrooms; decimals allowed              |
| `homeType`             | lowercase key, e.g. `condo`, `single-family`  | —          | Canonical key from `/listings/home-types`        |
| `limit`                | integer, 1–100                                | `20`       | Page size                                        |
| `offset`               | integer, 0–1,000,000                          | `0`        | Number of results to skip                        |
| `sortBy`               | `listedAt`, `price`, `squareFeet`, `bedrooms` | `listedAt` | Sort field                                       |
| `sortOrder`            | `ASC`, `DESC`                                 | `DESC`     | Sort direction                                   |

Results with no value for the sort field come last in either direction; ties are ordered by `id`.
Matching rules are defined in [Business rules](business-rules.md).

```http
GET /api/v1/listings?city=Pasadena&minPrice=700000&beds=3&baths=2.5&sortBy=price&sortOrder=ASC
```

```json
{
  "total": 1,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "source": "demo",
      "externalId": "DEMO-001",
      "address": "123 Example Avenue",
      "city": "Pasadena",
      "state": "CA",
      "zipcode": "91101",
      "price": 750000,
      "bedrooms": 3,
      "bathrooms": 2.5,
      "squareFeet": 1800,
      "listedAt": "2026-01-15",
      "photos": ["https://images.example.com/1.jpg"],
      "latitude": 34.1478,
      "longitude": -118.1445,
      "description": "A fictional home.",
      "propertyType": "Residential",
      "propertySubType": "SingleFamilyResidence",
      "homeType": { "value": "single-family", "label": "Single-family" },
      "yearBuilt": 2000,
      "lotSizeAcres": 0.15,
      "parkingSpaces": 2
    }
  ]
}
```

### Listing fields

| Field                                 | Type                       | Notes                                                          |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `id`                                  | string (UUID)              | Internal identity; use it for detail and open houses           |
| `source`, `externalId`                | string                     | Data source namespace and the source's listing number          |
| `address`, `city`, `state`, `zipcode` | string                     | Empty string when not provided                                 |
| `price`                               | number \| null             | USD                                                            |
| `bedrooms`, `bathrooms`               | number \| null             | Bathrooms may be fractional                                    |
| `squareFeet`                          | number \| null             | Living area                                                    |
| `listedAt`                            | string \| null             | `YYYY-MM-DD`                                                   |
| `photos`                              | string[]                   | HTTP(S) URLs in display order; may be empty                    |
| `latitude`, `longitude`               | number \| null             | A map needs both                                               |
| `description`                         | string                     | Plain text                                                     |
| `propertyType`, `propertySubType`     | string \| null             | Values as supplied by the source                               |
| `homeType`                            | `{ value, label }` \| null | Derived classification; `null` for missing or generic subtypes |
| `yearBuilt`, `parkingSpaces`          | number \| null             |                                                                |
| `lotSizeAcres`                        | number \| null             | Acres                                                          |

## Home types

`GET /api/v1/listings/home-types` returns every home type present in the inventory, independent
of any filter.

```json
[
  { "value": "single-family", "label": "Single-family" },
  { "value": "condo", "label": "Condo" },
  { "value": "townhouse", "label": "Townhouse" }
]
```

## City suggestions

`GET /api/v1/listings/cities?q=pas` returns up to 8 distinct city names that start with `q`
(1–100 characters), compared without case. Wildcard characters are matched literally. Other
filters are not applied.

```json
["Pasadena", "Paso Robles"]
```

## Listing detail

`GET /api/v1/listings/{id}` returns one listing object with the fields above.

## Open houses

`GET /api/v1/listings/{id}/openhouses` returns the listing's open houses ordered by date and
start time. An existing listing without events returns `[]`.

```json
[
  {
    "id": "22222222-2222-4222-8222-222222222222",
    "listingId": "11111111-1111-4111-8111-111111111111",
    "date": "2026-11-15",
    "startTime": "13:00:00",
    "endTime": "16:00:00",
    "timeZone": "America/Los_Angeles",
    "remarks": "Public viewing."
  }
]
```

## Health

| Path               | Success                                           | Failure                   |
| ------------------ | ------------------------------------------------- | ------------------------- |
| `/api/health/live` | `200 { "status": "ok" }`                          | —                         |
| `/api/health`      | `200 { "status": "ok", "database": "connected" }` | `503 SERVICE_UNAVAILABLE` |

## Errors

Every error uses the same body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request query.",
    "details": [{ "path": "beds", "message": "Too small: expected number to be >=0" }]
  },
  "requestId": "1b4e28ba-2fa1-41d2-883f-0016d3cca427"
}
```

`details` appears only for validation errors.

| Status | Code                   | Cause                                                            |
| ------ | ---------------------- | ---------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`     | A query or path value failed its schema (including non-UUID IDs) |
| 400    | `INVALID_SEARCH_RANGE` | `minPrice` is greater than `maxPrice`                            |
| 400    | `INVALID_PATH`         | The URL contains malformed percent-encoding                      |
| 400    | `INVALID_JSON`         | A request body is not valid JSON                                 |
| 403    | `ORIGIN_NOT_ALLOWED`   | The browser origin is not in `FRONTEND_ORIGINS`                  |
| 404    | `LISTING_NOT_FOUND`    | No listing has this ID                                           |
| 404    | `ROUTE_NOT_FOUND`      | The path does not exist                                          |
| 413    | `PAYLOAD_TOO_LARGE`    | A request body exceeds 32 KB                                     |
| 500    | `INTERNAL_ERROR`       | Unexpected failure; details are logged, not returned             |
| 503    | `SERVICE_UNAVAILABLE`  | The database is unreachable (health check)                       |
