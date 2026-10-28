# AI usage log

One entry per AI coding session (Claude Code). It records what I asked for, what the AI did, and what I reviewed, changed or rejected. Raw exported conversations are saved in [`ai-logs/`](ai-logs/) with `/export`.

Rules the AI follows are in [`../CLAUDE.md`](../CLAUDE.md). Stage prompts are in [`../MASTER_PROMPT.md`](../MASTER_PROMPT.md).

## Entry format

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

---

## 2026-10-28 — Stage 0: Project setup

- **Goal:** Set up the project foundation (Next.js, tooling, tests, database wiring, CI, docs) with no features yet, so every later stage starts from a working, tested, deployable base.
- **Key prompts I gave:**
  - The Stage 0 master prompt from `MASTER_PROMPT.md`: read CLAUDE.md and PLAN.md, plan first, then the 14 setup tasks.
  - "go" to approve the plan.
  - Later I switched Claude Code into plan mode, so it wrote a detailed plan file for the remaining steps, which I approved.
- **What the AI did:**
  - Wrote a numbered plan first and waited for approval.
  - Renamed `master` to `main`, committed the plan docs, created `stage-0-setup`.
  - Scaffolded Next.js 16.4.3 in a temporary folder and copied it in, so `CLAUDE.md` and `docs/` were not touched.
  - Read the Next.js 16 docs bundled in `node_modules` (as the generated `AGENTS.md` instructs) before configuring tests.
  - Added Prettier, shadcn/ui, Vitest (coverage gates), Playwright (desktop + 375px), Drizzle + Neon, `site.ts`, `.env.example`, CI, PR template and all docs.
  - Ran lint, format check, typecheck, tests with coverage, build and E2E, then committed in small prefixed commits.
- **What I reviewed / changed / rejected and why:**
  - Approved committing `MASTER_PROMPT.md` so reviewers can see how the AI was directed.
  - Approved a placeholder home page (name + tagline) so the tests check something real; the real landing page is Stage 1.
  - Interrupted the session once (while the AI was checking my Git identity), then switched to plan mode to review the remaining steps before more changes were made.
  - Commits use my GitHub noreply email, so my personal email stays out of a public repo.
  - Did the account steps myself (`vercel login`, `vercel link`, `vercel env pull`, importing the repo into Vercel, adding Neon), and had the AI create the public GitHub repo and open PR #1 only after I explicitly confirmed.
  - Set up branch protection on `main` myself. The AI found that my first settings (1 required approval, no bypass, no required checks) would block my own PRs forever while not enforcing CI. It explained this and waited for my OK; I then approved: PR required, 0 approvals, CI check "Lint, typecheck, test, build, E2E" required, no bypass, no force-push.
  - Asked the AI to merge PR #1 and handle the session log; it scanned the exported log for secrets before committing it to the public repo.
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **Git identity not set:** the first commit failed. Fixed by setting a repo-only identity (`jrcbrr` + GitHub noreply email).
  - **`create-next-app` refuses non-empty folders:** scaffolded into a temporary folder, then copied the files in.
  - **`LayoutProps` not found in typecheck:** Next 16 generates route types. Fixed by making `typecheck` run `next typegen` before `tsc`.
  - **Self-referencing font variable after shadcn init:** `--font-sans: var(--font-sans)`. Fixed by naming the Geist font variable `--font-sans` in `layout.tsx`.
  - **npm peer conflict installing `@vitejs/plugin-react`** (Babel 8 vs shadcn's Babel 7): left the plugin out, because Vite compiles JSX natively. No `--force` or `--legacy-peer-deps`.
  - **E2E tested the wrong app:** another local project was running on port 3000, and Playwright reused it. Fixed by giving E2E its own port (3100).
  - **`vercel link` / `vercel env pull` edited `.gitignore`:** both times they appended `.env*` after our `!.env.example` exception, which would make Git ignore `.env.example`. The AI caught it in `git diff` and reverted it; the existing rules already ignored `.env.local` and `.vercel/`.
  - **Neon connected:** `vercel env pull` brought in `DATABASE_URL` and `db:migrate` reached the database. drizzle-kit warned that the serverless driver connects over websockets. Stage 2 should point migrations at `DATABASE_URL_UNPOOLED` (direct connection).
  - **First Vercel preview failed** (`No Output Directory named "public"`): the project was imported while `main` held only docs, so Vercel set the framework to "Other". Fixed with a committed `vercel.json` (`"framework": "nextjs"`) rather than a dashboard-only setting, so the config is versioned and reviewable.
  - **3 low-severity `npm audit` warnings** in `deepmerge`, used inside the shadcn CLI (dev tooling only). The only "fix" downgrades shadcn to 1.0, so they were left and noted.
- **What I learned:**
  - Plan first, then build: the AI's plan surfaced decisions (branch naming, placeholder page, safe `db:migrate`) before any code was written.
  - New framework versions change things (route type generation, ESLint without `next lint`), so reading the version-matched docs matters more than memory.
  - CI runs the same commands I run locally, so "works on my machine" turns into "works everywhere".
- **Raw log:** [docs/ai-logs/2026-10-28-stage-0.md](ai-logs/2026-10-28-stage-0.md) (exported before the final merge, so the merge itself is not in the raw log)

## 2026-10-29 — Stage 1: Design system & landing page

- **Goal:** Give the app its look and identity (colour tokens, fonts, logo, mascot, favicon, theme and sound toggles, header, mobile tab bar, footer) and build the full landing page, tested on phone and desktop.
- **Key prompts I gave:**
  - The Stage 1 master prompt from `MASTER_PROMPT.md` (plan first, wait for "go").
  - Chose "Espresso text on gold" when the AI flagged that white text on Hermes gold fails WCAG AA.
  - Approved the plan.
- **What the AI did:**
  - Read the plan sections and the Next.js 16 docs for fonts and app icons, then wrote a plan in plan mode.
  - Found a conflict in `PLAN.md`: white on `#B8892E` is about 3.1:1, but the plan requires AA everywhere. It asked me instead of guessing.
  - Built tokens in `globals.css` (brand names plus shadcn aliases), fonts, theme provider and toggle, `useSound` hook, logo, mascot, app icons, header, tab bar, footer, landing sections and `formatPeso` / `formatTime`.
  - Used CSS keyframes for the cup animations instead of adding Motion now, so the landing page ships no extra JavaScript (Motion comes in Stage 4).
  - Took Playwright screenshots at 375px and 1280px in light and dark to check the layout itself, and fixed what it saw.
  - Wrote unit tests and Playwright checks, ran lint, format, typecheck, coverage, build and E2E, then committed in small prefixed commits.
- **What I reviewed / changed / rejected and why:**
  - Picked espresso text on gold buttons, keeping the exact brand gold.
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **AA contrast conflict in the plan:** resolved with espresso `primary-foreground`; `PLAN.md` updated.
  - **Name clash:** PLAN's `muted` is a text colour, but shadcn uses `muted` as a background. Mapped PLAN's `muted` to `muted-foreground` and documented the mapping in `ARCHITECTURE.md`.
  - **"Sign in" and cart showed on mobile:** the button styles set `inline-flex`, which overrode `hidden`. Fixed by wrapping desktop-only items in a `hidden md:flex` container. Caught from the screenshots, not the tests.
  - **`new Date()` in the footer** would break static prerendering with Cache Components. The footer now shows "© Hermes Express" without a year, as in the plan.
  - **No `user-event` package:** tests use `fireEvent` instead of adding a dependency.
  - **A commit picked up unrelated staged deletions:** the AI rebuilt the unpushed branch commits so each one holds one logical change.
- **What I learned:**
  - Design tokens let one class (`bg-surface`) work in both themes, so dark mode is mostly free once tokens exist.
  - Brand colours still need contrast checks; a "nice" palette can fail accessibility.
  - Hydration matters: the theme icon swaps through CSS (`dark:`) so server and browser render the same HTML.
  - Screenshots catch layout bugs that tests miss.
- **Raw log:** [docs/ai-logs/2026-10-29-stage-1.md](ai-logs/2026-10-29-stage-1.md) (to export with `/export`)
