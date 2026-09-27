# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CatZilla is a mobile-first accounting web app for a small cat-shelter volunteer group (donations, expenses, categories, cats, balance, reports). The UI is in Italian and the only currency is EUR. Read `docs/requirements.md` for the use cases and `docs/technology-choices.md` for the stack decision and its status.

The current code is a **local proof of concept**: Node + SQLite, a Hono API, Drizzle ORM, and a React + Vite SPA. Deliberately not built yet: audit history, Google login (a fake dev login stands in), deployment and backup. The likely deployment target is Cloudflare Workers + D1 (not confirmed yet), so keep server code portable. Hono and Drizzle were chosen because they run on both Node and Workers/D1. Don't add Node-only dependencies to request-handling code; Node specifics belong in `server/src/index.ts` and `server/src/db/client.ts`.

## Commands

Run from the repo root (npm workspaces `server` and `web`). Everything runs inside the VS Code dev container (Node 24).

```sh
npm install
npm run dev          # API on :3000 (tsx watch) + Vite on :5173, which proxies /api to :3000
npm test             # server API tests (vitest)
npm run typecheck    # tsc for both workspaces (TypeScript 7)
npm run build        # server -> server/dist (also copies drizzle/ migrations), web -> web/dist

npm test -w server -- test/auth.test.ts                  # one test file
npm test -w server -- test/auth.test.ts -t "keeps at least one"   # one test by name

npm run db:generate -w server   # after editing server/src/db/schema.ts; commit the generated SQL in server/drizzle/
```

There is no linter or formatter config. Only the web workspace has `noUnusedLocals`.

The dev database is `server/catzilla.db` (gitignored). Delete it to start fresh; on startup the server applies migrations and seeds an empty database.

## Architecture

**Server (`server/src`)**
- `app.ts` builds the Hono app from factories: `createApp(db, cfg)` mounts `routes/auth.ts` publicly under `/api/auth`, and every other route under `/api` behind the `requireUser` middleware. Each route module is a function `(db) => new Hono<AuthEnv>()...`, so tests can inject an in-memory database. `app.onError` maps `HTTPException` to `{ error }` JSON and SQLite UNIQUE violations to 409.
- `lib/auth.ts`: the session is a signed cookie holding the user id. `requireUser` reloads the user on every request, so disabling a user takes effect immediately. `requireAdmin` guards user management and the opening balance.
- `lib/validation.ts`: shared zod helpers (`isoDate`, `optionalText` turns empty strings into null, `amountCents`, `periodQuery`) and `validate()`, which wraps `@hono/zod-validator` to return 400 `{ error, issues }`. Zod runs with the Italian locale, and user-facing error messages are written in Italian.
- `db/client.ts` opens better-sqlite3, runs migrations and calls `db/seed.ts`. The seed is idempotent and runs only on an empty database: it creates the first admin (from `ADMIN_EMAIL`) and the three initial categories, `Cure veterinarie`, `Bollette` and `Cibo e beni`, with ids 1, 2 and 3.
- `routes/reports.ts` aggregates in SQL: the balance, totals per category for a period, and the per-cat summary.

**Web (`web/src`)**
- Talks to the API through a plain typed `fetch` wrapper in `api.ts`, not the Hono RPC client, because importing server types would pull Node-only source into the browser typecheck. **The TypeScript types in `api.ts` are maintained by hand to mirror the server's JSON; update them when a route's response changes.**
- TanStack Query for data. `useSave` (in `hooks.ts`) invalidates *all* queries after any mutation; the dataset is small. A 401 from anywhere sets the `['me']` query to null, and `App.tsx` then renders the login page.
- `period.ts` turns a month, year or custom range into `from`/`to` query parameters. Report and list endpoints take inclusive `from`/`to` dates.
- Routes and UI text are in Italian (`/movimenti`, `/spese/:id`, `/gatti`…). Styling is a single hand-written `styles.css` with light and dark tokens; there's no CSS framework. The report chart is plain HTML/CSS bars (`BarList`), with no chart library.

## Domain rules that span layers

- Amounts are **integer cents** everywhere in the API and database. The UI converts with `parseEuro` and `formatEuro` in `web/src/format.ts`, which accept Italian input such as `1.234,56`. Dates are `YYYY-MM-DD` strings; timestamps are ISO strings.
- **Nothing is hard-deleted.** Donations and expenses have `deleted_at`: they are excluded from balance and reports, can be restored, and cannot be edited while deleted. Categories and cats have `archived_at`. Users have `enabled`, and there must always be at least one enabled admin (checked inside the update transaction in `routes/users.ts`).
- An archived category or cat can't be chosen for a new expense, but an existing expense keeps the one it already has. `checkReferences` in `routes/expenses.ts` enforces this, and the expense form filters its options the same way.
- Every table has `created_by`/`updated_by`/`created_at`/`updated_at`, and every write must set `updatedBy`/`updatedAt`. These columns are the foundation for the audit history still to be built, which must record who, when, and the before and after values for donations, expenses, categories and cats.
- The balance is the opening balance (a single-row `settings` table, id = 1) + donations − expenses, counting only non-deleted entries.

## Tests

The tests in `server/test/` exercise the HTTP API end to end with `app.request()` against a fresh in-memory SQLite database per test. `setup()` in `test/helpers.ts` returns `loginAs(userId)`, which gives a small client carrying the session cookie. The seeded admin is user 1.

## Dependencies

- npm 11 blocks install scripts by default. The `allowScripts` field in the root `package.json` allows only better-sqlite3 (native build) and esbuild. A new dependency that needs an install script must be approved with `npm install-scripts approve <pkg>`.
- The `overrides` entry forces a patched esbuild into drizzle-kit's `@esbuild-kit/core-utils`, for security advisory GHSA-67mh-4wv8-2f99. Remove it after moving to drizzle-kit 1.0.
