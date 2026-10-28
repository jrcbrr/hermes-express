# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each build stage from [`docs/PLAN.md` §12](docs/PLAN.md) gets its own section.

## [Unreleased]

### Stage 2: Accounts, roles & protected routes (2026-10-29)

#### Added

- Email + password accounts with Better Auth (Drizzle adapter on Neon). Passwords are hashed; sessions are stored in Postgres.
- User fields `phone`, `role` (customer / barista / admin, default customer), `branchId`, `pointsBalance` and `defaultAddress`. Users cannot set their own role, branch or points.
- `/signup` and `/login` pages with Zod validation and formal, friendly error messages. Philippine mobile numbers in any common format are saved as `+639XXXXXXXXX`.
- `/profile` page to edit name, mobile number and default address, with shortcuts and log out (useful on phones).
- Header account menu: Log in / Sign up when signed out; Profile, Orders, Rewards, Log out when signed in; Barista and Admin links for those roles.
- `src/proxy.ts` sends signed-out visitors from checkout, orders, favorites, rewards, profile, `/barista` and `/admin` to login, and back afterwards.
- `requireUser()` / `requireRole()` server helpers; `/barista` (barista or admin) and `/admin` (admin) placeholder pages use them.
- Rate limiting on sign-up and login (5 per minute per IP, and per email for login), stored in Postgres; Better Auth's own endpoints use the same limiter.
- Tables `branch`, `user`, `session`, `account`, `verification`, `rate_limit` (migration `0000_auth_and_branches`).
- Seed script part 1: the 3 branches from `site.ts`, an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and one barista per branch, each with their own password variable. It stops with a clear error if a variable is missing or shorter than 8 characters. Pass `--reset-passwords` (`npm run db:seed -- --reset-passwords`) to apply changed seed passwords to existing staff accounts and sign them out; a normal run never overwrites passwords.
- `vercel.json` build command runs migrations before each build.
- Tests: roles, validation schemas, rate limiter, session helpers, auth and profile actions, proxy redirects, account menu, auth forms; E2E for protected-route redirects, form errors, and sign up → log out → log in (skips without a database).
- ADR [0002: Authentication and authorization](docs/decisions/0002-auth.md).

#### Changed

- The header's "Sign in" button is now the account menu ("Log in" and "Sign up" when signed out).
- New seed variables `SEED_BARISTA_TIPAS_PASSWORD`, `SEED_BARISTA_BGC_PASSWORD` and `SEED_BARISTA_LAKESHORE_PASSWORD` (placeholders in `.env.example`); there is no shared barista password.
- `docs/PLAN.md`, `docs/SETUP.md`: environment variables now say where each one is set. In Vercel, `BETTER_AUTH_SECRET` goes in Production and Preview, and `BETTER_AUTH_URL` in Production only; seed variables stay in `.env.local`.
- `docs/PLAN.md`: the proxy replaces "middleware", migrations run in the Vercel build command, rate-limit details, a rule that secret values are never printed, and a new "Decisions made by the owner (Stage 2)" table.

#### Databases

- Three separate Neon databases: `dev` (local work and E2E), `preview/<git-branch>` (one per PR, made by the Neon integration) and `main` (production only). `docs/SETUP.md` has a new "Databases" section explaining them.
- E2E safety check (`e2e/global-setup.ts`): Playwright refuses to run if `DATABASE_URL` points at the production branch.
- `docs/SETUP.md` no longer suggests `vercel env pull .env.local`, and warns that it overwrites `.env.local` with production values.

#### Fixed

- 23 E2E test accounts that had been created in the production database (before the `dev` branch existed) were removed.

#### Known gaps

- CI has no database yet, so the sign up → log out → log in E2E test skips there. TODO before Stage 5: a Neon `ci` branch and a `DATABASE_URL` GitHub secret (steps in `docs/SETUP.md`).

### Stage 1: Design system & landing page (2026-10-29)

#### Added

- "Olympus Café" design tokens as CSS variables for light and dark, wired into Tailwind; shadcn/ui names alias the brand tokens.
- Light/dark theme toggle with `next-themes` (follows the system until the visitor chooses).
- Nunito (headings) and Inter (body) via `next/font`.
- Original one-colour SVG winged-cup logo, wordmark, and Hermes mascot (line-art profile with winged helmet).
- App icons from the logo mark: `icon.svg` favicon and a generated 180×180 `apple-icon`.
- Desktop top bar (Home, Menu, Build Your Drink, Rewards, cart, sound, theme, sign in).
- Mobile slim top bar and bottom tab bar (Home, Menu, raised gold Build button, Cart, Profile).
- Footer with contacts and branch hours from `src/config/site.ts`.
- Sound toggle and `useSound` hook. Mute is saved in localStorage; the sounds themselves arrive in Stage 8.
- Landing page: hero with a looping cup-filling animation, How it works, Featured drinks (placeholder data until Stage 3), builder teaser (pour, stack, mix), Rewards, Branches.
- `formatPeso()` and `formatTime()` helpers in `src/lib/format.ts`.
- Unit tests for the theme toggle, sound toggle, nav, footer, brand art and landing page; Playwright checks on desktop and 375px mobile (sections, nav per screen size, theme and mute persistence, reduced motion).

#### Changed

- Light-mode `primary-foreground` is espresso `#2B1E17` instead of white, so text on gold buttons passes WCAG AA. `docs/PLAN.md` is updated to match.
- Replaced the default Next.js favicon and the Geist fonts.
- All animations stop when the visitor prefers reduced motion.

### Stage 0: Project setup (2026-10-28)

#### Added

- Next.js 16 app (App Router, TypeScript strict, Tailwind CSS v4, ESLint, `src/` directory, `@/*` alias), pinned to Node 24.
- Prettier with Tailwind class sorting; shadcn/ui initialised.
- `src/config/site.ts` with name, tagline, contacts and the 3 branches.
- Placeholder home page showing the name and tagline.
- Vitest + Testing Library with coverage gates (90% `src/lib`, `src/server`; 70% overall) and sample tests.
- Playwright smoke test on desktop and 375px mobile.
- Drizzle ORM with the Neon serverless driver, an empty schema, and `db:generate` / `db:migrate` / `db:seed` scripts.
- `.env.example` documenting every environment variable.
- GitHub Actions CI: lint, format check, typecheck, tests with coverage, build, E2E.
- Pull request template.
- Docs: README, SETUP, ARCHITECTURE, CONTRIBUTING, AI_LOG, ADR 0001 (tech stack).
