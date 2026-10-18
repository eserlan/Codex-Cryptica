# Quickstart: validating Cif-Guided Onboarding, Phase 1

How to prove the feature works. The design is in [data-model.md](./data-model.md) and [contracts/](./contracts/).

## Prerequisites

- Bun 1.3.14, with dependencies installed (`bun install`).
- On branch `feat/175-cif-guided-onboarding`.
- Validate only what this change touches (AGENTS.md: no repository-wide runs).

## Automated checks

```bash
# Engine (new package): unit tests + coverage ≥ 70%
cd packages/onboarding-journey-engine && bun test --coverage

# help-engine: shell controls and extraAvailable
cd packages/help-engine && bun test

# Changed files only
bun run lint:changed
bun run test:changed

# Type-check affected workspaces
bun scripts/affected-workspaces.mjs
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error

# Onboarding E2E (desktop, tablet, phone projects)
cd apps/web && bunx playwright test tests/first-run-onboarding-e2e.spec.ts tests/guided-setup-journeys.spec.ts tests/mobile-first-time-ux.spec.ts tests/help-onboarding.spec.ts
```

Expected: all pass, and the engine package reports ≥ 70% line coverage.

## What the automated checks cover

There is no manual checklist. Every scenario is asserted by a test:

| Behaviour                                                                                                                                                                                                                                                                                                                             | Where                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Invitation alone on a new vault; Explore, Close and returning-user rules; guest, demo and `?demo=`; converted demo; no stacking with the changelog or theme prompt                                                                                                                                                                    | `first-run-onboarding-e2e.spec.ts`          |
| All three journeys at 1280, 820 and 390 px, AI on and off; out-of-order steps; RPG GM needs two saves; Show me or fallback per width; card never covers the highlight; reload in the same session against a new session; zero AI requests; vault contains only what the test created; stored progress keys; axe and keyboard-only run | `guided-setup-journeys.spec.ts`             |
| Phone invitation and coach-mark suppression                                                                                                                                                                                                                                                                                           | `mobile-first-time-ux.spec.ts`              |
| Getting Started start, continue, start over, switch goal, ≤ 2 taps                                                                                                                                                                                                                                                                    | `help-onboarding.spec.ts`                   |
| Progress rules, version migration, privacy key set, performance and bundle budgets                                                                                                                                                                                                                                                    | `packages/onboarding-journey-engine/tests/` |
