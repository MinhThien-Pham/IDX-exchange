# IDX Exchange Web

React + TypeScript + Vite client for the IDX Exchange monorepo.

Run commands from the repository root. Read the root README for the complete local setup, PostgreSQL migration/seed steps, architecture, and Vercel/Neon deployment guide.

- `npm run dev -w @idx/web`: start the frontend on http://localhost:5173.
- `npm run typecheck -w @idx/web`: check browser TypeScript.
- `npm test -w @idx/web`: run component, HTTP boundary, validation, URL history, pagination and gallery tests.
- `npm run build -w @idx/web`: generate `frontend/dist` after the shared contracts package has been built.

Copy `.env.example` to `.env.local` if you need to customize the API origin or optional Maps Embed key. Vite exposes only explicitly public `VITE_` variables. Never put database credentials in frontend environment files.

Pages compose feature views. Each feature owns its API functions, query hooks, and UI. Shared request code parses responses against `@idx/contracts`; URL search parameters own committed filters, sorting and pagination. Draft form state stays local to the filter form.
