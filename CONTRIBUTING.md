# Contributing

Thanks for helping with Hermes Express. This guide explains how work moves from an idea to production.

## Workflow

1. **Start from an up-to-date `main`:**
   ```bash
   git checkout main
   git pull
   ```
2. **Create a branch.** One branch per stage or feature:
   - stages: `stage-<n>-<name>`, for example `stage-4-builder`
   - smaller work: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`
3. **Plan first.** For anything non-trivial, write a short plan (files, approach, tests) and get it reviewed before coding.
4. **Write tests with the code**, not after.
5. **Run the checks** (below) and open a pull request into `main`.
6. **CI must pass** and the **Vercel preview** must be checked on phone and desktop before merging.
7. **Never push directly to `main`.** It is protected and always deployable.

## Commit messages

Use a prefix, then a short description in the imperative mood ("add", not "added"). Keep one logical change per commit.

| Prefix      | Use for                                     |
| ----------- | ------------------------------------------- |
| `feat:`     | A new feature users can see                 |
| `fix:`      | A bug fix                                   |
| `docs:`     | Documentation only                          |
| `test:`     | Adding or changing tests or test setup      |
| `chore:`    | Tooling, dependencies, config               |
| `ci:`       | CI workflow changes                         |
| `style:`    | Formatting or visual-only changes, no logic |
| `refactor:` | Code changes that don't change behavior     |

Example: `feat: add sweetness slider to builder`

## Checks to run before a PR

```bash
npm run lint
npm run format:check   # npm run format to fix
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

## Pull request checklist

The PR template includes this list:

- [ ] Lint, typecheck, tests (with coverage) and build pass
- [ ] E2E tests pass
- [ ] Checked the Vercel preview at 375px and 1280px
- [ ] `CHANGELOG.md` updated (and `docs/ARCHITECTURE.md` if structure changed)
- [ ] `docs/AI_LOG.md` entry added if AI tools were used
- [ ] No secrets committed; migrations are additive

## Code standards

The full list is in [`CLAUDE.md`](CLAUDE.md). The most important rules:

- TypeScript strict. No `any`.
- Money in integer centavos. The server recomputes all prices.
- Every server action checks the session and role, and validates input with Zod.
- Use design tokens, never hard-coded colors.
- Accessible by default: semantic HTML, labels, keyboard support, visible focus.
- **Database migrations are additive.** Never drop or rename columns or tables without a plan.
- **Never commit secrets.** Only `.env.example` is tracked.
- Don't delete or weaken tests to make them pass.
