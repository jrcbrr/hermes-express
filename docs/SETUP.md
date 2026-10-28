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

| Variable                                   | Needed from        | Purpose                                  |
| ------------------------------------------ | ------------------ | ---------------------------------------- |
| `DATABASE_URL`                             | Stage 2            | Neon Postgres connection                 |
| `BETTER_AUTH_SECRET`                       | Stage 2            | Signs session cookies                    |
| `BETTER_AUTH_URL`                          | Stage 2            | App base URL                             |
| `RESEND_API_KEY`                           | Stage 8 (optional) | Sends receipt emails; skipped if missing |
| `EMAIL_FROM`                               | Stage 8            | Sender address                           |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Stage 2            | First admin account                      |

## 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## 5. Database

The database is Neon Postgres, accessed through Drizzle ORM.

| Command                  | When to use it                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `npm run db:generate`    | After editing `src/db/schema.ts`. Creates a SQL migration in `src/db/migrations/`. Commit it.     |
| `npm run db:migrate`     | Applies pending migrations to the database in `DATABASE_URL`. Skips if `DATABASE_URL` is not set. |
| `npm run db:seed`        | Fills the database with branches, menu, promos and staff (from Stage 2).                          |
| `npx drizzle-kit studio` | Opens a browser UI to look at the data.                                                           |

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

## 7. Deployment

- Hosting is **Vercel**, connected to the GitHub repo.
- Every pull request gets a **preview deployment** with its own Neon preview database branch.
- Merging into `main` deploys to **production** automatically.
- To roll back, open the Vercel dashboard, go to Deployments, choose a previous deployment and select **Promote to Production**.

## Troubleshooting

| Problem                                     | Fix                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL is not set`                   | Create `.env.local` (see step 3).                                                                       |
| E2E: `Executable doesn't exist`             | Run `npx playwright install chromium`.                                                                  |
| Typecheck: `Cannot find name 'LayoutProps'` | Run `npm run typecheck`, which generates Next's route types first. Running `tsc` alone skips that step. |
