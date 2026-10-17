# @idx/web

React + TypeScript + Vite web app for IDX Exchange. Run commands from the repository root; see
[Getting started](../docs/getting-started.md) for the full setup.

| Command                         | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `npm run dev -w @idx/web`       | Start the web app on http://localhost:5173              |
| `npm test -w @idx/web`          | Component, model and HTTP client tests                  |
| `npm run typecheck -w @idx/web` | Type check                                              |
| `npm run build -w @idx/web`     | Build to `frontend/dist` (build `@idx/contracts` first) |

Configuration lives in `frontend/.env` (see `.env.example`). Only `VITE_*` variables reach the
browser, and all of them are public.

Code is organized by feature (`src/features/<name>/{api,hooks,model,components}`), with shared
building blocks in `src/shared`. See [Architecture](../docs/architecture.md#frontend) and
[Project structure](../docs/project-structure.md#frontend).
