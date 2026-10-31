# Hermes Express

> **Brewed by you. Delivered by Hermes.**

Hermes Express is a coffee-ordering web app where customers **build their own drink step by step**: a cup that fills, layers that stack, a drink that mixes. They then choose pickup or delivery from one of three branches in Taguig. Baristas manage a live order queue for their branch, and admins manage the menu, prices, promos and customers.

Built solo for the **NYHA Junior Dev Hackathon**.

**Live demo:** [hermes-express.vercel.app](https://hermes-express.vercel.app)

> Demo project: payments are simulated. No real payment data is ever collected.

## Features

**Customers**

- Coffee builder: pour, stack and mix, with a live price, undo, reset and "Surprise me"
- Perfect Pour: an optional hold-and-release game for a badge, by touch or keyboard
- Menu with signature drinks, pastries, snacks and per-branch sold-out labels
- Cart and checkout with promo codes and points, pickup or delivery, ASAP or scheduled
- Demo payment by GCash, card or cash, with no real payment taken
- Live order tracking, receipts with PDF download and email, and item ratings
- Favorites, order history with reorder, loyalty points, badges and sound effects

**Baristas**

- Live order queue and sold-out toggles for their own branch

**Admins**

- Sales dashboard with revenue by day, orders by branch and top items
- Orders across all branches, menu and ingredient prices, promo codes
- Customer profiles, points adjustments and staff roles

**Throughout**

- Phone and desktop layouts, light and dark themes, reduced-motion support
- WCAG A/AA checks with axe in the E2E suite

## Demo accounts

| Role    | Email                                          | Branch           |
| ------- | ---------------------------------------------- | ---------------- |
| Barista | `barista.tipas@hermes-express.test`            | Tipas            |
| Barista | `barista.bgc@hermes-express.test`              | BGC              |
| Barista | `barista.taguig-lakeshore@hermes-express.test` | Taguig Lakeshore |
| Admin   | Provided with the password                     | All              |

Passwords are not published, because a public admin login would let anyone change the live menu and see customer details. Hackathon judges receive them with the submission. To try the customer side, sign up for a new account.

Progress is tracked stage by stage in [`CHANGELOG.md`](CHANGELOG.md).

## Credits

The sound effects in `public/sounds` (pour, clink, ding) are original, synthesized by `scripts/generate-sounds.mjs` for this project. Menu photo credits are on the `/credits` page.

## Tech stack

| Layer             | Choice                                                        |
| ----------------- | ------------------------------------------------------------- |
| Framework         | Next.js 16 (App Router), React 19, TypeScript (strict)        |
| Styling           | Tailwind CSS v4, shadcn/ui                                    |
| Database          | Neon Postgres + Drizzle ORM                                   |
| Auth              | Better Auth (email + password)                                |
| Validation        | Zod                                                           |
| Animation / theme | Motion, next-themes                                           |
| Email / charts    | Resend, Recharts                                              |
| Testing           | Vitest + Testing Library, Playwright                          |
| CI/CD             | GitHub Actions, Vercel (preview per PR, production on `main`) |

Why these choices: [`docs/decisions/0001-tech-stack.md`](docs/decisions/0001-tech-stack.md).

## Architecture

A Next.js App Router app on Vercel. Pages are Server Components by default, and every change goes through a server action that checks the session, role and branch, and validates its input with Zod. Drizzle talks to Neon Postgres. Prices are integer centavos, always recomputed on the server by one pure function, and order status changes pass through one transition table. Order tracking polls every 10 seconds, which suits serverless hosting. Details and the data model are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

Requirements: Node.js 24+, npm.

```bash
git clone https://github.com/jrcbrr/hermes-express.git
cd hermes-express
npm ci
cp .env.example .env.local   # or: npx vercel env pull .env.local
npm run dev                  # http://localhost:3000
```

The menu and builder need a seeded database. Full setup, including the database and deployment, is in [`docs/SETUP.md`](docs/SETUP.md).

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
