# Technology choices

Status: **in discussion**. A recommendation is waiting for confirmation.

This file tracks how the technology stack is chosen for CatZilla, based on [requirements.md](requirements.md).

# Drivers from the requirements

| Requirement | Technical consequence |
|---|---|
| Cost as close to zero as possible | Free tier for hosting, database and authentication. Nothing that is billed per hour of uptime. |
| Small group (2–5 users), low traffic | Scalability doesn't matter. Free-tier limits won't be hit, but some free tiers *pause* inactive projects. |
| Login required, per-user identity | Needs a managed authentication service or an access-control proxy. Avoid writing our own password handling. |
| Full audit history, soft delete, archival | Relational data with history. Ideally the history is recorded by the database itself (e.g. triggers), so the client can't skip it. |
| Reports by category, by cat, by period | Aggregate queries (SUM / GROUP BY). SQL is the natural fit. |
| Mobile-first web app, Italian UI, EUR | Responsive web front end. No native app. |
| Indefinite retention, periodic backup | The free tier must allow a data export or dump, or we script one ourselves. |
| Maintained by volunteers | Few moving parts, little to operate, no servers to patch. |

# Candidate architectures

All free-tier limits and conditions below must be checked against the providers' current terms before the final decision.

## A. Static front end + Supabase (Postgres + Auth)
* Front end: SPA on Cloudflare Pages / Netlify / GitHub Pages.
* Back end: Supabase. It provides Postgres, authentication, an auto-generated API and Row Level Security.
* Audit history: Postgres triggers write to a history table. This is enforced by the database.
* Pros: real SQL, built-in auth, almost no back-end code.
* Cons: free projects are **paused after 7 days of inactivity** and deleted if they stay paused for a long time. A daily scheduled request keeps the project awake, but that's a workaround we would depend on. The free tier has no automatic backups, so we'd script a `pg_dump`.

## B. Static front end + Cloudflare Workers + D1 (SQLite) + Cloudflare Access
* Front end: Cloudflare Pages.
* API: a small Cloudflare Worker.
* Database: D1, which is SQLite. It has point-in-time restore for a limited window.
* Login: ~~Cloudflare Access (Zero Trust) in front of the whole app~~. The Zero Trust free plan requires a credit card, so it is excluded. Instead, the Worker implements Google login (OIDC) itself, which is standard and portable.
* Audit history: SQLite triggers, or history written by the Worker in the same transaction.
* Pros: no pausing, generous free tier with no credit card, SQL, EU jurisdiction for D1, everything on one provider.
* Cons: we have to write a small API layer and the login flow. The Workers runtime is specific to Cloudflare.

## C. Static front end + Firebase (Firestore + Auth)
* Pros: mature auth, no pausing, good SDKs.
* Cons: Firestore is NoSQL, so reports would be aggregated on the client. Enforcing an audit history without Cloud Functions, which need the paid plan, is fragile.

## E. Spring Boot on Google Cloud Run + Neon (serverless Postgres) — excluded for now
Excluded because Cloud Run needs a billing account with a credit card. To reconsider if that constraint changes.

* Back end: Spring Boot app in a container on Cloud Run, which scales to zero and has a monthly free tier. The front end is served by the same app, or by a static host.
* Database: Neon, a serverless Postgres with a free tier and EU regions. Its compute suspends when idle and wakes automatically on the next query, so the project is not paused.
* Login: Google login with Spring Security OAuth2, which costs nothing.
* Audit history: Postgres triggers, or Hibernate Envers.
* Pros: uses the maintainer's existing skills (Java, Spring Boot, Maven). Everything is standard (a container and Postgres), so it's the most portable option.
* Cons: cold start after being idle. A plain Spring Boot app may take several seconds to wake, which a GraalVM native image or a lighter framework reduces. Cloud Run needs a billing account (credit card) even when usage stays in the free tier. There are more moving parts to build and deploy than in A or B.

## D. Discarded
* **Google Sheets + Apps Script:** cheap, but weak on audit, validation and UX.
* **Free VM (e.g. Oracle Cloud Always Free) running a traditional stack:** it works, but volunteers would have to operate it (OS updates, TLS, backups).

# Answers from the stakeholder

| # | Question | Answer | Consequence |
|---|---|---|---|
| 1 | Developer skills | Maintained by one developer who knows Java, Spring Boot, Maven, Python and uv, and is willing to learn React or similar. | Option E fits the existing skills. A and B need TypeScript/JavaScript, which is acceptable. |
| 2 | Login method | A Google account is preferred. Email and password is acceptable if it's cheaper. | All options support Google login for free, so we use Google login. |
| 3 | User management | Done by an administrator user. | New requirement: an administrator role and a *Manage users* use case (added to requirements.md). The app keeps its own list of allowed users, so it doesn't matter who owns a Google account. |
| 4 | EU hosting | Required. | Database in an EU region: Supabase and Neon offer EU regions, D1 has an EU jurisdiction option (to verify). A Data Processing Agreement with each provider is needed. |
| 5 | Offline use | Not needed. | No offline sync, which keeps things simpler. |
| 6 | Domain | A free subdomain is enough. | Use the provider's subdomain (`*.pages.dev`, `*.run.app`, …). |
| 7 | Provider lock-in | Tradeoffs requested. | See below. |

# Provider lock-in: tradeoffs

Lock-in isn't a single thing. It happens separately at each layer of the app:

| Layer | Portable choice | Lock-in choice |
|---|---|---|
| Data | Postgres / SQLite, which can be exported with a standard dump | Firestore, which uses a proprietary model |
| Business logic | Code on a standard runtime (Spring Boot, or TypeScript with a portable framework such as Hono) | Logic living in provider features (auto-generated APIs, security rules) |
| Login | Standard OAuth2 / OIDC with Google, implemented in the app | A login proxy (Cloudflare Access) or a provider's auth service |
| Hosting | Container image, static files | Proprietary runtime (Workers) |

**The real risk for a zero-cost app is that free tiers change**, not that a provider becomes expensive. Heroku, Fly.io and PlanetScale have all removed or cut their free plans in recent years. If that happens, we'll have to move, and lock-in decides how much work the move is.

* **More lock-in (A, B, C):** less code and less to operate, because the provider does the work (login, API, triggers, scaling). In exchange, moving means rewriting the parts that depend on the provider.
* **Less lock-in (E):** more code and a more complex deployment. In exchange, the app is a standard container with a standard Postgres database and can move to any host (another free tier, a cheap VPS, or a volunteer's machine) with little work.

**Mitigations that apply to any option:**
* Keep the data in SQL (Postgres or SQLite) and run a scheduled export (e.g. a GitHub Actions job that saves a dump). This also covers the backup requirement.
* Keep the business logic in our own code, not in provider-specific features.
* Put login behind a standard protocol (OIDC with Google).

With these mitigations, the lock-in left in A or B is the hosting runtime and the login integration, which are a few days of work to replace. The data is always safe.

# Answers from the stakeholder, round 2

| # | Question | Answer | Consequence |
|---|---|---|---|
| 1 | Lock-in | Acceptable to start with, but it must stay under control. | Apply the mitigations above. The goal is that moving to another provider only means rewriting a thin layer. |
| 2 | Credit card | Avoid it for now. To be discussed again in the future. | Option E (Cloud Run) and Cloudflare Access are excluded. |
| 3 | Cold start | A few seconds is acceptable. | Doesn't discriminate between the remaining options. |
| — | Languages and frameworks | They carry only a relative weight. The maintainer can learn new ones. | Java skills are not a reason to prefer an option. |

# Verified facts (September 2026)

* **D1 supports an `eu` jurisdiction**, which guarantees where the database runs and stores data. It can only be set when the database is created. Source: [Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2025-11-05-d1-jurisdiction/).
* **The Cloudflare Zero Trust free plan requires a credit card.** Source: [Cloudflare Community](https://community.cloudflare.com/t/credit-card-to-use-the-free-zero-trust/519654).
* **Supabase pauses free projects after 7 days of inactivity**, and deletes projects that stay paused for a long time. Source: [Supabase docs](https://supabase.com/docs/guides/platform/free-project-pausing).

# Recommendation

**Option B, revised: Cloudflare Pages + Workers + D1, with Google login implemented in the app.**

* **Front end:** a static single-page app on Cloudflare Pages.
* **API:** a Cloudflare Worker written in TypeScript with a portable web framework, one that also runs on Node, Bun or Deno (e.g. Hono). Business rules live in our code.
* **Database:** D1 created with the `eu` jurisdiction. The audit history is written by SQLite triggers, or by the API in the same transaction.
* **Login:** Google OIDC implemented in the Worker, with a session cookie. The app keeps its own `users` table: only enabled users can log in, and the administrator manages it.
* **Backup:** a scheduled GitHub Actions job exports D1 (`wrangler d1 export`) and stores the dump. The dump contains donor names, so it must go to private storage and be encrypted.

Why:
* It's the only option that meets every constraint: free, no credit card, no pausing, EU data, SQL and Google login.
* Lock-in is limited to the hosting runtime and D1. The schema is plain SQLite, the API framework is portable, and login uses a standard protocol.

Alternative: **Option A (Supabase)** with a daily keep-alive request, if we prefer Postgres and built-in login over writing the login flow. It's a fallback, because the project depends on a workaround to avoid being paused.

# Next steps

1. Confirm the recommendation.
2. Choose the frameworks: front end (React or alternatives), API framework, data access and migrations, testing.
3. Define the repository layout, the local development setup and the deployment pipeline.

# Google login with personal accounts

The shelter has no Google Workspace licence, only personal Google accounts (@gmail.com). This is enough:
* Google login (OpenID Connect) works with any personal Google account. Workspace is not needed.
* The OAuth client is created in Google Cloud Console with a personal account. It's free and needs no billing account or credit card.
* The consent screen uses the *External* user type. The app asks only for `openid`, `email` and `profile`, which are non-sensitive scopes, so Google verification isn't required.
* In *Testing* status, only listed test users (up to 100) can log in. That's enough for a small group, or the app can be published to *In production*.
* Which volunteers can use the app is still decided by the app's own `users` table, managed by the administrator. Google only proves who the person is.

# Several shelters

Other shelters may want to use CatZilla. Each shelter gets **its own deployment** from the same repository. The app stays single-tenant: there is no organization concept in the code or in the database.

What each shelter gets:
* Its own Worker and D1 database (created with the `eu` jurisdiction).
* Its own Google OAuth client, in *Testing* status with its volunteers listed as test users (up to 100).
* Its own first administrator (`ADMIN_EMAIL`) and its own backup job.

Ideally these live in accounts owned by the shelter (Cloudflare, Google Cloud, GitHub), with the maintainer added as a collaborator. The data then belongs to the shelter, each shelter has its own free-tier limits, and the maintainer doesn't become a data processor for several organizations.

Consequences:
* Deployment is a parameterized script: one command creates the D1 database, applies migrations and deploys for a given shelter.
* Every release, migrations included, is rolled out to each deployment.
* The code contains nothing specific to one shelter. Values like the shelter's name come from configuration.
* Google login identifies users by the Google `sub`, not only by email. Optionally, tokens with an `hd` claim (Workspace accounts) are rejected, so only personal accounts are used.

Alternatives considered and rejected:
* **Shared database with an `org_id` column on every table.** Estimated at 5–8 days of development on top of Google login: memberships and invitations, rebuilt tables and audit triggers, a shelter filter on every query, and isolation tests. A single missed filter would expose one shelter's data to another. It also requires publishing the OAuth client *In production* (with a privacy policy and, preferably, a custom domain), makes the maintainer a GDPR processor for every shelter, and makes restoring a single shelter's data harder.
* **One database per shelter behind a single deployment.** Queries stay the same, but routing, bindings and migrations across many databases add infrastructure complexity, and the D1 free plan limits the number of databases.

# Local proof of concept

Before choosing the deployment environment, we build a POC that runs locally.

| Topic | Choice | Rationale |
|---|---|---|
| Dev environment | VS Code dev container (Node 24 image, Claude Code included), config in `.devcontainer/` | No Node installed on the host. Everyone gets the same environment. |
| Runtime | Node + SQLite, TypeScript | Portable: the same code can later target Cloudflare Workers + D1 or another host. |
| API | Hono | Runs on Node, Workers, Bun and Deno. |
| Data access | Drizzle ORM | Supports both SQLite on Node and D1, so the data layer is portable. |
| Front end | React + Vite single-page app | Separate static app calling a JSON API. Can be hosted anywhere as static files. |
| Login | Fake dev login (pick a user, no password) | Fastest to build. Google login is added later. |
| Use cases in scope | Login + user management; donations and expenses (with categories and cats, archival, soft delete); balance and reports; audit history | Covers the core of the app. |
| Audit history | SQLite triggers write every change to an `audit_log` table | Enforced by the database, so no code path can skip it. D1 supports triggers, so it carries over to Option B. |
| Out of scope | Google login, deployment, backup | To be added after the POC. |

# Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-27 | Exclude Option E (Cloud Run) and Cloudflare Access | Both require a credit card. |
| 2026-09-27 | Proposed: Option B, revised | Pending confirmation. |
| 2026-09-27 | Build a local POC first (Node + SQLite + Hono + Drizzle + React) | Validate the app before committing to a deployment environment. The stack is portable to Option B. |
| 2026-09-27 | Audit history via SQLite triggers | Recorded by the database itself, as the requirements prefer. The acting user comes from each row's `updated_by`, so no session context is needed. Portable to D1. |
| 2026-09-27 | Several shelters: one single-tenant deployment each | No code changes, full isolation, still free. A shared multi-tenant database would cost 5–8 days of development plus GDPR and operational duties. See *Several shelters*. |
