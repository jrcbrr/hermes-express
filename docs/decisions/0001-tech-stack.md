# ADR 0001: Tech stack

- **Status:** Accepted
- **Date:** 2026-10-28
- **Stage:** 0 (setup)

## Context

Hermes Express is a full-stack web app built by one junior developer in one week. It needs:

- server-rendered pages and server-side business logic (pricing, orders, roles)
- a relational database (orders, items, points ledger, stock per branch)
- rich animation for the coffee builder
- a preview deployment for every pull request, and automatic production deploys
- tests and CI that a team could rely on

Industry-standard, well-documented tools are preferred so other developers (and reviewers) can pick the project up quickly.

## Decision

| Layer      | Choice                          | Main reason                                                                                                                                     |
| ---------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | **Next.js 16, App Router**      | Frontend and backend in one TypeScript codebase. Server Components and server actions keep data and logic on the server. First-class on Vercel. |
| Language   | **TypeScript (strict)**         | Catches mistakes before runtime; the industry default for React.                                                                                |
| Styling    | **Tailwind CSS v4 + shadcn/ui** | Design tokens as CSS variables. shadcn copies accessible components into the repo so we own and restyle them.                                   |
| Database   | **Neon Postgres**               | Serverless Postgres, added in one click from the Vercel Marketplace, with a separate database branch per preview deploy.                        |
| ORM        | **Drizzle ORM + drizzle-kit**   | Type-safe queries that stay close to SQL; versioned SQL migration files we can review.                                                          |
| Auth       | **Better Auth** (Stage 2)       | Email + password with sessions, works with Drizzle, supports custom user fields such as `role`.                                                 |
| Validation | **Zod** (Stage 2)               | One schema shared by forms and server actions.                                                                                                  |
| Unit tests | **Vitest + Testing Library**    | Fast, TypeScript-native, tests components the way users use them.                                                                               |
| E2E tests  | **Playwright**                  | Real browsers, mobile viewports, runs in CI.                                                                                                    |
| CI         | **GitHub Actions**              | Lives next to the code; free for public repos.                                                                                                  |
| Hosting/CD | **Vercel**                      | Preview URL per PR and automatic production deploys from `main`.                                                                                |

## Consequences

**Good**

- One language (TypeScript) end to end, with types shared from database to UI.
- Every PR is checked by CI and gets a live preview with its own database, so `main` stays deployable.
- Pure business logic in `src/lib` is easy to unit test and reuse on client and server.

**Trade-offs**

- Next.js 16 is newer than most tutorials, so we follow the version-matched docs bundled in `node_modules/next/dist/docs/`.
- Vercel and Neon are managed services. Free tiers are enough for a hackathon, but production use would need paid plans.
- No websockets on serverless. Live order updates use 10-second polling (to be recorded in a later ADR).
- `@vitejs/plugin-react` is left out of the test setup. Vite compiles JSX natively, and the plugin's optional Babel 8 peer dependency conflicts with the Babel 7 used by the shadcn CLI.

## Alternatives considered

- **Vite SPA + separate Express API:** two deployments and two codebases to keep in sync; more work for one person in one week.
- **Prisma instead of Drizzle:** mature, but heavier and more abstracted from SQL. Drizzle's SQL-like API and plain migration files are easier to review.
- **Supabase or Firebase:** fast to start, but they push logic into a vendor's client SDK and security rules. We want server actions with our own authorization checks.
- **NextAuth / Auth.js:** better suited to OAuth. Email + password with custom roles is simpler in Better Auth.
- **Jest instead of Vitest:** slower, and needs extra setup for TypeScript and ESM.
