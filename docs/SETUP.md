# Setup guide

How to run Hermes Express on your machine, test it, and deploy it.

## 1. Prerequisites

| Tool                  | Version                    | Check with      |
| --------------------- | -------------------------- | --------------- |
| Node.js               | 24 or newer (see `.nvmrc`) | `node -v`       |
| npm                   | comes with Node            | `npm -v`        |
| Git                   | any recent                 | `git --version` |
| GitHub CLI (optional) | any recent                 | `gh --version`  |

## 2. Install

```bash
git clone https://github.com/jrcbrr/hermes-express.git
cd hermes-express
npm ci
```

`npm ci` installs the exact versions from `package-lock.json`, the same way CI does.

## 3. Environment variables

All variables are listed and explained in [`.env.example`](../.env.example).

- **Easiest (project linked to Vercel):** `npx vercel env pull .env.local` downloads the development values, including the Neon `DATABASE_URL`.
- **Manual:** copy `.env.example` to `.env.local` and fill in the values.

`.env.local` is git-ignored. Never commit it.

| Variable                                   | Needed from        | Purpose                                                     |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------- |
| `DATABASE_URL`                             | Stage 2            | Neon Postgres connection                                    |
| `BETTER_AUTH_SECRET`                       | Stage 2            | Signs session cookies                                       |
| `BETTER_AUTH_URL`                          | Stage 2            | App base URL                                                |
| `RESEND_API_KEY`                           | Stage 8 (optional) | Sends receipt emails; skipped if missing                    |
| `EMAIL_FROM`                               | Stage 8            | Sender address                                              |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Stage 2            | First admin account                                         |
| `SEED_BARISTA_TIPAS_PASSWORD`              | Stage 2            | Password for `barista.tipas@hermes-express.test`            |
| `SEED_BARISTA_BGC_PASSWORD`                | Stage 2            | Password for `barista.bgc@hermes-express.test`              |
| `SEED_BARISTA_LAKESHORE_PASSWORD`          | Stage 2            | Password for `barista.taguig-lakeshore@hermes-express.test` |

Every seed password needs at least 8 characters; the seed stops with a clear error otherwise. Generate strong values (and `BETTER_AUTH_SECRET`, with 32 bytes) like this:

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

On Vercel, leave `BETTER_AUTH_URL` unset for **Preview**: the app then uses the preview's own URL (`VERCEL_URL`).

## 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## 5. Database

The database is Neon Postgres, accessed through Drizzle ORM.

| Command                  | When to use it                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run db:generate`    | After editing `src/db/schema.ts`. Creates a SQL migration in `src/db/migrations/`. Commit it.                                                                |
| `npm run db:migrate`     | Applies pending migrations to the database in `DATABASE_URL`. Skips if `DATABASE_URL` is not set.                                                            |
| `npm run db:seed`        | Adds the 3 branches from `site.ts`, the admin and one barista per branch. Safe to re-run: it never overwrites passwords. Menu and promos arrive in Stage 3+. |
| `npx drizzle-kit studio` | Opens a browser UI to look at the data.                                                                                                                      |

Rule: **migrations are additive only.** Never drop or rename columns or tables without a migration plan (see `CLAUDE.md`).

## 6. Tests and checks

Run these before opening a PR. CI runs the same ones.

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

- **Unit tests** (Vitest) live next to the code as `*.test.ts(x)`.
- **Coverage gate:** 90% for `src/lib/**` and `src/server/**`, 70% overall. The HTML report is in `coverage/index.html`.
- **E2E tests** (Playwright) live in `e2e/`. They start the app on port 3100 by themselves. The first time, install the browser with `npx playwright install chromium`.

### CI database (TODO before Stage 5)

CI has no database yet, so the database-backed E2E test (`e2e/auth.spec.ts`, "sign up → log out → log in") **skips itself** when `DATABASE_URL` is missing. Before Stage 5 (checkout), set this up so it runs on every PR:

1. In the Neon console, create a branch named `ci` from `main`.
2. In GitHub → Settings → Secrets and variables → Actions, add repository secrets `DATABASE_URL` (the `ci` branch's pooled connection string) and `BETTER_AUTH_SECRET`.
3. In `.github/workflows/ci.yml`, pass both secrets as `env` and run `npm run db:migrate` before the E2E step.

Locally, all requests share one rate-limit bucket (there is no client IP), so the E2E test sends a random test IP header to stay under the 5-per-minute login limit.

## 7. Deployment

- Hosting is **Vercel**, connected to the GitHub repo.
- Every pull request gets a **preview deployment** with its own Neon preview database branch.
- Merging into `main` deploys to **production** automatically.
- `vercel.json` sets the build command to `npm run db:migrate && npm run build`, so each deployment applies new migrations to its own database before building.
- To roll back, open the Vercel dashboard, go to Deployments, choose a previous deployment and select **Promote to Production**.

## Troubleshooting

| Problem                                     | Fix                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL is not set`                   | Create `.env.local` (see step 3).                                                                       |
| E2E: `Executable doesn't exist`             | Run `npx playwright install chromium`.                                                                  |
| Typecheck: `Cannot find name 'LayoutProps'` | Run `npm run typecheck`, which generates Next's route types first. Running `tsc` alone skips that step. |
