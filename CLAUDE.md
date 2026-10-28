# CLAUDE.md — Hermes Express

Rules for every AI coding session in this repo. Read this first, then `docs/PLAN.md`.

## Project
Hermes Express is a coffee-ordering web app. Customers build their own drink step by step (a cup that fills, layers that stack and mix), then choose pickup or delivery from one of 3 branches. Roles: customer, barista, admin.
Full spec: `docs/PLAN.md`. The plan wins over assumptions. If something isn't in the plan, ask.

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- Neon Postgres + Drizzle ORM (migrations in `src/db/migrations`)
- Better Auth (email + password), Zod, Motion (Framer Motion), next-themes, Resend, Recharts
- Vitest + Testing Library (unit/integration), Playwright (E2E)
- GitHub Actions (CI), Vercel (preview + production deploys)
- Package manager: **npm**

## Commands
```
npm run dev            # local dev server
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest
npm run test:coverage  # Vitest with coverage gate
npm run test:e2e       # Playwright
npm run build          # production build
npm run db:generate    # drizzle-kit generate (after schema changes)
npm run db:migrate     # apply migrations
npm run db:seed        # seed branches, menu, promos, staff
```
**Before saying a task is done, run: lint, typecheck, test, build. All must pass.**

## How to work
1. **Plan first.** For any feature, write a short plan (files to touch, approach, tests) and wait for my approval before coding.
2. **Work on a branch.** Never commit directly to `main`. Use the stage branch (e.g. `stage-4-builder`).
3. **Small commits** with simple prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `style:`, `refactor:`. One logical change per commit.
4. **Write tests with the code**, not after. Business logic in `src/lib` and `src/server` needs ≥90% coverage.
5. **Update docs** when behavior changes: `CHANGELOG.md`, and `docs/ARCHITECTURE.md` if structure changes.
6. **Log the session** in `docs/AI_LOG.md` at the end (see format below).
7. Explain what you changed and why in plain language; I'm learning.

## Code rules
- TypeScript strict. No `any`, no `@ts-ignore` without a comment explaining why.
- Server Components by default; `"use client"` only where interaction is needed.
- Mutations through **server actions** in `src/server/<feature>/`. Validate every input with Zod.
- **Money is integer centavos.** Format with `formatPeso()` only in the UI.
- **Never trust client prices.** The server recomputes totals with `src/lib/pricing.ts`.
- **Authorization on the server** for every action: check session, role, and (for baristas) branch.
- Order status changes must go through `src/lib/order-status.ts` transitions.
- Keep components small. Feature components live in `src/components/<feature>/`.
- Use design tokens (CSS variables / Tailwind theme), never hard-coded hex colors in components.
- Accessibility: semantic HTML, labels on all inputs, keyboard support, visible focus, AA contrast, respect `prefers-reduced-motion`.
- Mobile first. Check every page at 375px and 1280px wide.
- UI copy is formal and warm. No slang, no emoji.
- Site name, tagline, contacts and branches come from `src/config/site.ts`, never hard-coded.

## Ship safely
- Never commit secrets. Only `.env.example` is committed.
- DB migrations must be additive. Never drop/rename columns or tables without asking me.
- Don't change CI, auth, or the DB schema outside the current stage's scope without asking.
- Don't delete or rewrite tests to make them pass. Fix the code, or explain why the test is wrong.
- Don't install new dependencies without saying why.
- Never force-push or rewrite history on `main`.

## Brand quick reference
- Tagline: "Brewed by you. Delivered by Hermes."
- Primary: Hermes gold `#B8892E` (dark `#D4A853`). Accent: Aegean blue `#2F5D7C` (dark `#6FA3C7`).
- Background cream `#FAF6EF` / night roast `#14110F`. Text espresso `#2B1E17` / `#F3ECE2`.
- Fonts: Nunito (headings), Inter (body).
- Logo and mascot are original minimalist line-art SVGs (winged cup; Hermes with winged helmet).

## AI_LOG.md entry format
```
## YYYY-MM-DD — Stage N: <title>
- **Goal:**
- **Key prompts I gave:**
- **What the AI did:**
- **What I reviewed / changed / rejected and why:**
- **Problems & fixes:**
- **What I learned:**
- **Raw log:** docs/ai-logs/<file>.md
```
