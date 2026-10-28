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
  - _(Add your own notes here: anything you questioned, changed or rejected.)_
- **Problems & fixes:**
  - **Git identity not set:** the first commit failed. Fixed by setting a repo-only identity (`jrcbrr` + GitHub noreply email).
  - **`create-next-app` refuses non-empty folders:** scaffolded into a temporary folder, then copied the files in.
  - **`LayoutProps` not found in typecheck:** Next 16 generates route types. Fixed by making `typecheck` run `next typegen` before `tsc`.
  - **Self-referencing font variable after shadcn init:** `--font-sans: var(--font-sans)`. Fixed by naming the Geist font variable `--font-sans` in `layout.tsx`.
  - **npm peer conflict installing `@vitejs/plugin-react`** (Babel 8 vs shadcn's Babel 7): left the plugin out, because Vite compiles JSX natively. No `--force` or `--legacy-peer-deps`.
  - **E2E tested the wrong app:** another local project was running on port 3000, and Playwright reused it. Fixed by giving E2E its own port (3100).
  - **3 low-severity `npm audit` warnings** in `deepmerge`, used inside the shadcn CLI (dev tooling only). The only "fix" downgrades shadcn to 1.0, so they were left and noted.
- **What I learned:**
  - Plan first, then build: the AI's plan surfaced decisions (branch naming, placeholder page, safe `db:migrate`) before any code was written.
  - New framework versions change things (route type generation, ESLint without `next lint`), so reading the version-matched docs matters more than memory.
  - CI runs the same commands I run locally, so "works on my machine" turns into "works everywhere".
- **Raw log:** docs/ai-logs/2026-10-28-stage-0.md _(export with `/export` at the end of the session)_
