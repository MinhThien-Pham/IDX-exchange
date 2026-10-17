# Deployment

Production runs as two Vercel projects built from the same repository, with PostgreSQL on Neon.

```text
Browser ──▶ Web project (Vite static build) ──HTTPS──▶ API project (Express function) ──▶ Neon PostgreSQL
```

Only the API project receives database credentials. Migrations and data imports are explicit
operator commands; they never run during a build or a request.

## 1. Neon database

1. Create a Neon project (for example `idx-exchange`) with PostgreSQL 18, in a region close to
   the API's Vercel region (`iad1`, US East).
2. In the **Connect** panel, select the branch, database and role.
3. Copy the **pooled** connection string. It becomes `DATABASE_URL` for the API.
4. Optionally copy the **direct** (unpooled) connection string for the same branch and database.
   It becomes `DATABASE_MIGRATION_URL` on the machine that runs migrations.
5. With those values in `backend/.env`, run from the repository root:

   ```sh
   npm run db:migrate
   npm run db:import -- --write --batch-size=250   # production data; see data-import.md
   ```

   Use `npm run db:seed` instead of the import for a demo database.

Keep Neon's connection options (including SSL settings) exactly as copied. See
[Neon: connect from any application](https://neon.com/docs/connect/connect-from-any-app).

## 2. API project

Import the repository into Vercel as a project for the API.

| Setting                                  | Value                                           |
| ---------------------------------------- | ----------------------------------------------- |
| Root Directory                           | `backend`                                       |
| Include files outside the Root Directory | Enabled (the build needs `packages/contracts`)  |
| Framework, install and build commands    | Leave unset; `backend/vercel.json` defines them |
| Node.js version                          | 24.x                                            |

`backend/vercel.json` builds the contracts and the API from the workspace root and pins the
function region to `iad1`. `src/app.ts` default-exports the Express app, which Vercel runs as a
function.

Environment variables:

| Variable           | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| `DATABASE_URL`     | Neon **pooled** connection string                                            |
| `NODE_ENV`         | `production`                                                                 |
| `FRONTEND_ORIGINS` | Exact web origin(s), comma-separated, e.g. `https://idx-exchange.vercel.app` |
| `LOG_LEVEL`        | `info`                                                                       |

After deploying, check:

- `GET https://<api-domain>/api/health/live` → `{ "status": "ok" }`
- `GET https://<api-domain>/api/health` → `{ "status": "ok", "database": "connected" }`

The API has no page at `/`; a JSON `404` there is expected.

## 3. Web project

Import the repository again as a second project for the web app.

| Setting                                  | Value                                            |
| ---------------------------------------- | ------------------------------------------------ |
| Root Directory                           | `frontend`                                       |
| Framework preset                         | Vite                                             |
| Include files outside the Root Directory | Enabled                                          |
| Install and build commands               | Leave unset; `frontend/vercel.json` defines them |
| Output directory                         | `dist`                                           |
| Node.js version                          | 24.x                                             |

`frontend/vercel.json` rewrites page routes to `index.html`, so a direct visit to
`/property/{id}` works.

Environment variables:

| Variable                   | Value                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL`        | API origin only, e.g. `https://idx-exchange-api.vercel.app` (no `/api`, no trailing slash) |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional browser key restricted to Maps Embed API and the web domain                       |

`VITE_*` values are compiled into the bundle: changing them requires a new web deployment.
After the web project has its final domain, set that domain in the API's `FRONTEND_ORIGINS` and
redeploy the API.

## 4. Smoke test

1. Both health endpoints respond as above.
2. `GET https://<api-domain>/api/v1/listings?limit=1` returns a listing and a plausible `total`.
3. In the web app: search a city, add a filter, change the sort and page, open a listing, refresh
   the detail URL, check open houses, and return to the same search.
4. Open the browser console: no CORS errors.
5. For any failed request, find its `X-Request-ID` in the API project's runtime logs.

After a full import, compare the row counts reported by the importer with
`SELECT count(*) FROM listings` and spot-check a few listings against the source.

## Previews and production

- A push to a branch other than the production branch creates a preview deployment; it does not
  change production.
- Preview web deployments have their own origins. Add an origin to `FRONTEND_ORIGINS` only when
  that preview must call the API, and redeploy the API. Do not use wildcard origins.
- If Vercel Deployment Protection is enabled on the API, browsers receive a login page instead of
  JSON. The API used by the public web app must be publicly reachable.

## Operating limits

Both services are planned on free tiers. Idle Neon compute and Vercel functions may suspend, so
the first request after a quiet period can be slower. Check storage, compute and bandwidth quotas
in [Vercel Hobby](https://vercel.com/docs/plans/hobby) and [Neon plans](https://neon.com/docs/introduction/plans).
