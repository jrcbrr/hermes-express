# Hermes Express

> **Brewed by you. Delivered by Hermes.**

Hermes Express is a coffee-ordering web app where customers **build their own drink step by step**: a cup that fills, layers that stack, a drink that mixes. They then choose pickup or delivery from one of three branches in Taguig. Baristas manage a live order queue for their branch, and admins manage the menu, prices, promos and customers.

Built solo for the **NYHA Junior Dev Hackathon**.

**Live demo:** _coming soon (Vercel production URL)_

> Demo project: payments are simulated. No real payment data is ever collected.

## Screenshots

_Coming soon: desktop and mobile screenshots of the landing page, coffee builder, order tracker and barista queue._

## Features

| Priority           | Features                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** (must ship) | Landing page, menu, coffee builder (pour / stack / mix, live price, undo), cart, checkout with demo payment, order tracking, barista queue, admin menu and prices, sold-out toggle, auth with roles |
| **P1** (core)      | Favorites and one-tap reorder, order history, loyalty points, promo codes, ratings, scheduled orders, email receipts, badges, sound effects, "Surprise me"                                          |
| **P2** (polish)    | Perfect Pour mini-game, sales dashboard charts, admin customer editing                                                                                                                              |

Progress is tracked stage by stage in [`CHANGELOG.md`](CHANGELOG.md).

## Credits

The sound effects in `public/sounds` (pour, clink, ding) are original, synthesized by `scripts/generate-sounds.mjs` for this project. Menu photo credits are on the `/credits` page.

## Tech stack

| Layer             | Choice                                                        |
| ----------------- | ------------------------------------------------------------- |
| Framework         | Next.js 16 (App Router), React 19, TypeScript (strict)        |
| Styling           | Tailwind CSS v4, shadcn/ui                                    |
| Database          | Neon Postgres + Drizzle ORM                                   |
| Auth              | Better Auth (email + password) _(Stage 2)_                    |
| Validation        | Zod _(Stage 2)_                                               |
| Animation / theme | Motion, next-themes _(Stage 1+)_                              |
| Email / charts    | Resend, Recharts _(Stage 8–9)_                                |
| Testing           | Vitest + Testing Library, Playwright                          |
| CI/CD             | GitHub Actions, Vercel (preview per PR, production on `main`) |

Why these choices: [`docs/decisions/0001-tech-stack.md`](docs/decisions/0001-tech-stack.md).

## Quick start

Requirements: Node.js 24+, npm.

```bash
git clone https://github.com/jrcbrr/hermes-express.git
cd hermes-express
npm ci
cp .env.example .env.local   # or: npx vercel env pull .env.local
npm run dev                  # http://localhost:3000
```

The app runs without a database for now. Full setup, including the database and deployment, is in [`docs/SETUP.md`](docs/SETUP.md).

## Scripts

| Command                           | What it does                                         |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Start the local dev server                           |
| `npm run lint`                    | Check code with ESLint                               |
| `npm run format` / `format:check` | Format / check formatting with Prettier              |
| `npm run typecheck`               | Check TypeScript types                               |
| `npm run test`                    | Run unit and integration tests (Vitest)              |
| `npm run test:coverage`           | Run tests with the coverage gate                     |
| `npm run test:e2e`                | Run browser tests (Playwright)                       |
| `npm run build`                   | Production build                                     |
| `npm run db:generate`             | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate`              | Apply migrations to the database                     |
| `npm run db:seed`                 | Seed branches, menu, promos and staff                |

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md): full product plan and spec
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system diagram, structure, key rules
- [`docs/SETUP.md`](docs/SETUP.md): local setup, database, tests, deployment
- [`CONTRIBUTING.md`](CONTRIBUTING.md): branching, commits, PR checklist
- [`docs/decisions/`](docs/decisions/): architecture decision records (ADRs)
- [`docs/AI_LOG.md`](docs/AI_LOG.md): how AI tools were used, session by session
- [`CLAUDE.md`](CLAUDE.md): rules for AI coding sessions

## Contact

- Instagram: [@jrcbrr\_](https://instagram.com/jrcbrr_)
- Phone: 0939 008 2560
- Email: johnrudolph2010@gmail.com
