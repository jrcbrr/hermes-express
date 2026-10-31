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

- Copy `.env.example` to `.env.local` and fill in the values. For `DATABASE_URL`, use the Neon **dev** branch (see "Databases" below), never main.

`.env.local` is git-ignored. Never commit it, and never paste its values into chat, issues or PRs.

> **Warning: don't run `vercel env pull` without checking first.**
> `npx vercel env pull` writes to `.env.local` by default and **overwrites it**. That would replace your dev database with the **production** one (Vercel stores main's connection string for every environment) and delete your seed passwords and `BETTER_AUTH_SECRET`.
> If you really need Vercel's values, pull into a separate file you delete afterwards (for example `npx vercel env pull .env.vercel.local`), copy over only what you need, and back up `.env.local` first (`cp .env.local .env.local.backup`).

### Databases

There are three separate Neon databases (branches of the same Neon project):

| Environment           | Neon branch            | Where its URL comes from                                          | Used for                                    |
| --------------------- | ---------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Local (your computer) | `dev`                  | `.env.local` (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`)            | `npm run dev`, E2E tests, trying things out |
| Preview (one per PR)  | `preview/<git-branch>` | Added by the Neon integration when each preview deployment builds | Checking a PR on its Vercel preview         |
| Production            | `main`                 | Vercel environment variables (Production)                         | The live site. Never test against it.       |

- Preview branches are copies of `main` made when a PR's first preview deploys; each deploy then runs migrations on its own branch.
- `dev` is a copy of `main` too. To refresh it, reset it from its parent in the Neon console (Branches → `dev` → Reset from parent), then run `npm run db:migrate` and `npm run db:seed`.
- **E2E safety check:** `e2e/global-setup.ts` asks the database which Neon branch it is and **refuses to run the tests if it is `main`** (production).
- A backup of the previous `.env.local` (which pointed at `main`) is kept as `.env.local.backup`. It is git-ignored; delete it once you no longer need it.

| Variable                                   | Needed from        | Purpose                                                     |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------- |
| `DATABASE_URL`                             | Stage 2            | Neon Postgres connection                                    |
| `BETTER_AUTH_SECRET`                       | Stage 2            | Signs session cookies                                       |
| `BETTER_AUTH_URL`                          | Stage 2            | App base URL                                                |
| `RESEND_API_KEY`                           | Stage 5 (optional) | Sends receipt emails; skipped if missing                    |
| `EMAIL_FROM`                               | Stage 5            | Sender address                                              |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Stage 2            | First admin account                                         |
| `SEED_BARISTA_TIPAS_PASSWORD`              | Stage 2            | Password for `barista.tipas@hermes-express.test`            |
| `SEED_BARISTA_BGC_PASSWORD`                | Stage 2            | Password for `barista.bgc@hermes-express.test`              |
| `SEED_BARISTA_LAKESHORE_PASSWORD`          | Stage 2            | Password for `barista.taguig-lakeshore@hermes-express.test` |

Every seed password needs at least 8 characters; the seed stops with a clear error otherwise. Generate strong values (and `BETTER_AUTH_SECRET`, with 32 bytes) like this:

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

Never paste secret values into chat, issues, PRs or docs. Refer to them by variable name.

### Variables in Vercel

Add these under Vercel → Project → Settings → Environment Variables:

| Name                 | Value / where to get it                                                                | Environments        |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------- |
| `BETTER_AUTH_SECRET` | Generate a **new** value (don't reuse your local one) with the command above, 32 bytes | Production, Preview |
| `BETTER_AUTH_URL`    | `https://hermes-express.vercel.app`                                                    | Production only     |

- `DATABASE_URL` is added automatically by the Neon integration.
- Leave `BETTER_AUTH_URL` unset for **Preview**: the app then uses the preview's own URL (`VERCEL_URL`).
- The `SEED_*` variables stay in `.env.local` only. The seed runs from your machine, never on Vercel.
- After adding or changing a variable, redeploy so the deployment picks it up.

## 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## 5. Database

The database is Neon Postgres, accessed through Drizzle ORM.

| Command                                | When to use it                                                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:generate`                  | After editing `src/db/schema.ts`. Creates a SQL migration in `src/db/migrations/`. Commit it.                                                                                      |
| `npm run db:migrate`                   | Applies pending migrations to the database in `DATABASE_URL`. Skips if `DATABASE_URL` is not set.                                                                                  |
| `npm run db:seed`                      | Adds the 3 branches from `site.ts`, the menu and promo codes (via `db:seed:catalog`), the admin and one barista per branch. Safe to re-run: it never overwrites passwords.         |
| `npm run db:seed:catalog`              | Adds only the menu: ingredients, products, promo codes and demo sold-out flags. Needs no secrets. Inserts missing rows only, so it never undoes admin edits.                       |
| `npm run db:seed -- --reset-passwords` | Same as above, but also sets existing staff passwords to the current `.env.local` values and signs those accounts out everywhere. Use it after changing a `SEED_*_PASSWORD` value. |
| `npx drizzle-kit studio`               | Opens a browser UI to look at the data.                                                                                                                                            |

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

### CI database (TODO)

CI has no database yet, so the database-backed E2E tests (`e2e/auth.spec.ts` "sign up → log out → log in", the menu and builder tests, and `e2e/checkout.spec.ts` "build → cart → checkout → order created") **skip themselves** when `DATABASE_URL` is missing. They all run locally against the Neon dev branch. Set this up so they run on every PR:

1. In the Neon console, create a branch named `ci` from `main`.
2. In GitHub → Settings → Secrets and variables → Actions, add repository secrets `DATABASE_URL` (the `ci` branch's pooled connection string) and `BETTER_AUTH_SECRET`.
3. In `.github/workflows/ci.yml`, pass both secrets as `env` and run `npm run db:migrate` before the E2E step.

Locally, all requests share one rate-limit bucket (there is no client IP), so the E2E test sends a random test IP header so repeated runs stay under the per-IP limit.

## 7. Deployment

- Hosting is **Vercel**, connected to the GitHub repo.
- Every pull request gets a **preview deployment** with its own Neon preview database branch.
- Merging into `main` deploys to **production** automatically.
- `vercel.json` sets the build command to `npm run db:migrate && npm run db:seed:catalog && npm run build`, so each deployment applies new migrations to its own database and adds any missing menu rows before building. The catalog seed never changes rows that already exist.
- To roll back, open the Vercel dashboard, go to Deployments, choose a previous deployment and select **Promote to Production**.

## Troubleshooting

| Problem                                     | Fix                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL is not set`                   | Create `.env.local` (see step 3).                                                                       |
| E2E: `Executable doesn't exist`             | Run `npx playwright install chromium`.                                                                  |
| Typecheck: `Cannot find name 'LayoutProps'` | Run `npm run typecheck`, which generates Next's route types first. Running `tsc` alone skips that step. |
