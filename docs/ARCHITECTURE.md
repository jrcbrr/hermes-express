# Architecture

This is a short overview of how Hermes Express is built. The full product spec is in [`PLAN.md`](PLAN.md).

## System diagram

```mermaid
flowchart LR
  subgraph Client["Browser (phone or desktop)"]
    UI["React UI<br/>Server + Client Components"]
  end

  subgraph Vercel["Vercel (Next.js 16)"]
    RSC["Server Components<br/>(pages, data reads)"]
    SA["Server actions<br/>src/server/&lt;feature&gt;"]
    API["Route handlers<br/>src/app/api (auth, polling)"]
    LIB["Pure business logic<br/>src/lib (pricing, points,<br/>promos, order-status)"]
    AUTH["Better Auth<br/>(sessions, roles)"]
  end

  DB[("Neon Postgres<br/>via Drizzle ORM")]
  MAIL["Resend<br/>(email receipts)"]

  UI -- "page requests" --> RSC
  UI -- "forms / mutations" --> SA
  UI -- "status polling (10s)" --> API
  RSC --> LIB
  SA --> LIB
  SA --> AUTH
  API --> AUTH
  RSC --> DB
  SA --> DB
  AUTH --> DB
  SA -. "on order placed" .-> MAIL

  subgraph Delivery["CI/CD"]
    GH["GitHub<br/>pull request"] --> CI["GitHub Actions<br/>lint, types, tests, build, E2E"]
    GH --> PREV["Vercel preview<br/>+ Neon preview branch"]
    MAIN["merge to main"] --> PROD["Vercel production"]
  end
```

## How a request flows

1. **Reading data:** a page is a **Server Component**. It reads from Postgres through Drizzle on the server and sends finished HTML to the browser. No database code ever reaches the browser.
2. **Changing data:** forms call a **server action** in `src/server/<feature>/`. Every action:
   1. checks the session, role, and (for baristas) branch
   2. validates the input with Zod
   3. uses pure functions from `src/lib` (for example `pricing.ts`) to compute the result
   4. writes to the database
3. **Signing in and roles** (details in [ADR 0002](decisions/0002-auth.md)):
   1. Login and sign-up forms call server actions in `src/server/auth/actions.ts`. Each one validates with Zod, checks the Postgres rate limiter (`src/server/rate-limit.ts`), then calls Better Auth, which sets an HTTP-only session cookie.
   2. `src/proxy.ts` (Next.js 16's name for middleware) runs before protected pages. No session cookie → redirect to `/login?next=…`. It only looks at the cookie.
   3. The page or action then calls `requireUser()` or `requireRole([...])` from `src/server/auth/session.ts`. These load the session from the database and check the role. This is the real security check.
   4. Which paths need which role is defined once in `src/lib/roles.ts`.
   5. The header reads the session inside `<Suspense>`, so the rest of every page can still be prerendered (Cache Components).
4. **Live updates:** the order tracker and barista queue poll a route handler every 10 seconds. This is simpler than websockets and works well on serverless hosting (ADR coming in a later stage).

## Folder structure

```
src/
├─ app/          Routes (App Router). Pages, layouts, route handlers.
├─ components/   React components. ui/ = shadcn primitives, <feature>/ = feature components:
│  ├─ brand/     Logo mark, wordmark, Hermes mascot (one-colour SVG, currentColor).
│  ├─ layout/    Site header, desktop nav, mobile tab bar, footer, nav-items list.
│  ├─ landing/   Landing page sections (hero, how it works, featured, teaser, rewards, branches).
│  ├─ theme/     next-themes provider and the light/dark toggle.
│  ├─ sound/     Sound mute toggle (uses hooks/use-sound.ts).
│  ├─ auth/      Login and sign-up forms, labelled form field.
│  ├─ profile/   Profile edit form.
│  └─ staff/     Role-guarded placeholder for /barista and /admin.
├─ config/       site.ts: name, tagline, contacts, branches (single source of truth).
├─ db/           Drizzle client (index.ts), schema.ts, migrations/, seed.ts, seed-env.ts.
├─ lib/          Pure, framework-free business logic. Heavily unit tested (90% gate).
│  ├─ auth.ts    Better Auth setup (created lazily on first use).
│  ├─ roles.ts   Roles and which paths need which role.
│  └─ validation/ Zod schemas (auth.ts: sign-up, login, profile, PH phone).
├─ server/       Server actions and queries grouped by feature (90% gate).
│  ├─ auth/      Session helpers (requireUser/requireRole) and auth actions.
│  ├─ profile/   updateProfile action.
│  └─ rate-limit.ts Postgres fixed-window rate limiter.
├─ hooks/        Client-side React hooks.
└─ proxy.ts      Cookie check that redirects signed-out visitors from protected pages.
e2e/             Playwright browser tests.
scripts/         Node scripts run by npm (for example db-migrate.ts).
docs/            Plan, architecture, setup, ADRs, AI logs.
```

## Design tokens

Colours are CSS variables in `src/app/globals.css`, defined once for light (`:root`) and once for dark (`.dark`, set by next-themes). `@theme inline` turns each one into a Tailwind colour, so `bg-surface` or `text-primary` works in both themes. Components never use raw hex values.

Brand tokens use the names from [`PLAN.md` §3](PLAN.md#color-palette--olympus-café): `background`, `surface`, `surface-muted`, `foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `success`, `danger`, `border`. shadcn/ui primitives expect their own names, so those are aliases:

| shadcn/ui name       | Points to                | Note                                         |
| -------------------- | ------------------------ | -------------------------------------------- |
| `card`, `popover`    | `surface`                |                                              |
| `muted`, `secondary` | `surface-muted`          | shadcn uses `muted` as a background colour   |
| `muted-foreground`   | PLAN's `muted` text tone | so secondary text is `text-muted-foreground` |
| `input`              | `border`                 |                                              |
| `destructive`        | `danger`                 |                                              |
| `ring`               | `accent`                 | Aegean blue focus outline                    |

Illustration colours (`coffee-espresso`, `coffee-latte`, `coffee-milk`, `coffee-foam`) are tokens too. Fonts: `font-sans` is Inter (body) and `font-heading` is Nunito (h1–h4), both loaded with `next/font`.

Animations are CSS keyframes (`hx-*` in `globals.css`). Each illustration's resting state is the finished drink, and `prefers-reduced-motion: reduce` turns all animations off.

## Key rules

| Rule                                                            | Why                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Money is integer centavos** (`15000` = ₱150)                  | Avoids floating-point rounding errors. Formatted only in the UI.          |
| **The server recomputes every price** with `src/lib/pricing.ts` | Never trust a total sent by the browser.                                  |
| **Order status changes go through `src/lib/order-status.ts`**   | One place defines the allowed transitions, and invalid ones are rejected. |
| **Authorization on the server** for every action                | Hiding a button is not security.                                          |
| **Order items snapshot their config and prices**                | Later menu edits don't change past orders.                                |
| **Server Components by default**                                | Less JavaScript in the browser; `"use client"` only for interaction.      |
| **Brand text and branches come from `src/config/site.ts`**      | Change them once, and every page updates.                                 |

## Data model

Tables are added stage by stage (users and auth in Stage 2, catalog in Stage 3, orders in Stage 5, rewards in Stage 8). The planned model is in [`PLAN.md` §9](PLAN.md#data-model-drizzle--postgres). Tables so far:

```mermaid
erDiagram
  branch ||--o{ user : "baristas work at"
  user ||--o{ session : has
  user ||--o{ account : "logs in with"
  branch {
    text id PK
    text slug UK
    text name
    text address
    text opens_at
    text closes_at
    boolean is_active
  }
  user {
    text id PK
    text email UK
    text name
    text phone "+639XXXXXXXXX"
    text role "customer | barista | admin"
    text branch_id FK "baristas only"
    int points_balance
    text default_address
  }
  session {
    text id PK
    text token UK
    text user_id FK
    timestamp expires_at
  }
  account {
    text id PK
    text user_id FK
    text provider_id "credential"
    text password "scrypt hash"
  }
  verification {
    text id PK
    text identifier
  }
  rate_limit {
    text key PK
    int count
    bigint window_start
  }
```

## Environments

| Environment | Trigger            | Database                                   |
| ----------- | ------------------ | ------------------------------------------ |
| Local       | `npm run dev`      | Neon dev branch (via `.env.local`)         |
| Preview     | Every pull request | Neon preview branch, created automatically |
| Production  | Merge to `main`    | Neon main branch                           |

## Notes for AI agents

`AGENTS.md` is generated by Next.js. It tells coding agents to read the version-matched docs in `node_modules/next/dist/docs/`, because Next.js 16 APIs differ from older versions. Project rules are in `CLAUDE.md`.

## Decisions

Architecture decisions are recorded in [`decisions/`](decisions/):

- [0001: Tech stack](decisions/0001-tech-stack.md)
- [0002: Authentication and authorization](decisions/0002-auth.md)
