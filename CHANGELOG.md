# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each build stage from [`docs/PLAN.md` §12](docs/PLAN.md) gets its own section.

## [Unreleased]

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
