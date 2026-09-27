# CatZilla

Accounting app for a volunteer cat shelter. See [docs/requirements.md](docs/requirements.md) and
[docs/technology-choices.md](docs/technology-choices.md).

This is the **local proof of concept**: Node + SQLite, Hono API, Drizzle ORM, React + Vite front end.
Login is a fake dev login (pick a user, no password). Google login, deployment and backup are not
implemented yet.

## Run

Open the folder in the VS Code dev container, then:

```sh
npm install
npm run dev
```

- Web app: http://localhost:5173 (proxies `/api` to the API)
- API: http://localhost:3000

On first start the API creates `server/catzilla.db`, applies migrations, and seeds an administrator
(`admin@example.org`, override with `ADMIN_EMAIL`) and the initial expense categories.

## Other commands

| Command | What it does |
|---|---|
| `npm test` | API tests (in-memory SQLite) |
| `npm run typecheck` | Type-check server and web |
| `npm run build` | Build server (`server/dist`) and web (`web/dist`) |
| `npm run db:generate -w server` | Generate a migration after changing `server/src/db/schema.ts` |

## Layout

```
server/            Hono API on Node
  src/db/          Drizzle schema, connection, seed
  src/routes/      one file per resource
  drizzle/         SQL migrations (generated, committed)
  test/            API tests
web/               React + Vite single-page app (Italian UI)
  src/pages/       one file per screen
```

## Conventions

- Amounts are integer cents (EUR); dates are `YYYY-MM-DD`.
- Nothing is hard-deleted. Entries have `deleted_at`, categories and cats have `archived_at`,
  users have `enabled`.
- Every row records `created_by` / `updated_by`. SQLite triggers
  (`server/drizzle/0002_audit_triggers.sql`) copy every change to donations, expenses, categories
  and cats into `audit_log`, shown in the app as "Storico".

## Dependency notes

- `overrides` in the root `package.json` bumps the esbuild used by `@esbuild-kit/core-utils`
  (pulled in by drizzle-kit 0.31) from 0.18 to a patched version, fixing advisory
  [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99). Remove it when
  drizzle-kit 1.0 (which drops `@esbuild-kit`) is released and adopted.
- `allowScripts` lists the only packages allowed to run install scripts: better-sqlite3 (native
  module) and esbuild (platform binary).

## Server environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `DB_FILE` | `catzilla.db` | SQLite file path |
| `ADMIN_EMAIL` | `admin@example.org` | First administrator, created only on an empty database |
| `SESSION_SECRET` | dev value | Required when `NODE_ENV=production` |
| `DEV_LOGIN` | on unless production | Enables the passwordless dev login |
