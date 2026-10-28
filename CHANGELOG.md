# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each build stage from [`docs/PLAN.md` §12](docs/PLAN.md) gets its own section.

## [Unreleased]

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
