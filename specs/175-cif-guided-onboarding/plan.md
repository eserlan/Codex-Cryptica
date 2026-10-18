# Implementation Plan: Cif-Guided Onboarding, Phase 1

**Branch**: `feat/175-cif-guided-onboarding` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/175-cif-guided-onboarding/spec.md` (epic #3994: #3995, #3996, #3997, with #4000 tests alongside)

## Summary

Brand-new users get a small goal invitation (Build a world, Write a story, Prepare an RPG campaign, Explore on my own) instead of the auto-started tour. Choosing a goal starts a short journey shown in its own card, ending in a real, visible result. A new framework-free package, `onboarding-journey-engine`, holds the versioned journey definitions and a pure progress reducer. The web app feeds it content-free milestones from events that already exist: entity created with its category, connection added, generator saved, search or explorer focus, graph area. "Show me" reuses Cif's existing guidance actions and runner, so nothing in this feature can change the vault, and nothing sends an AI request unless the user taps "Ask Cif". The decision is made by the existing pure first-run orchestrator, with one new action kind, moved out of `(app)/+layout.svelte` into an `OnboardingHost` component.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `help-engine` (guidance action schema, catalogue, `validateAction`, quick prompts; extended with shell controls and `extraAvailable`), `HelpActionRunner` and `HelpHighlightService`, `onboarding-orchestrator` (extended), `OnboardingStore`, `helpStore` tour, `GettingStartedChecklist`, `vaultEventBus`, `@codex/events` app bus (`JOURNAL:CAPTURE`), `categories` store, `zod`. New internal package `packages/onboarding-journey-engine`. No new third-party dependency.
**Storage**: `localStorage` through the injected `StorageLike`: `codex-onboarding-journey:<vaultId>` (journey progress), `codex_goal_invitation` and `codex_chosen_goal` (device-wide choice). `sessionStorage`: `codex-onboarding-journey-active` (reload rule). No IndexedDB, OPFS or vault schema change, so no migration.
**Testing**: `bun test` (engine), Vitest (help-engine, app units and components), Playwright (desktop, tablet and phone E2E, extending the #1791 first-run specs)
**Target Platform**: Browser (local-first web app), desktop, tablet and phone
**Project Type**: Web application (Bun workspace monorepo: `apps/web` plus `packages/*`)
**Performance Goals**: The invitation appears within one first-run evaluation after the vault initialises. Applying a milestone and updating the card feels instant (< 16 ms of work per event). The new package adds < 10 KB gzipped to the app bundle.
**Constraints**: Zero AI requests except an explicit "Ask Cif" tap. Zero vault writes from guidance. Works offline and with AI disabled. No storage of names, text or ids. Never stacks with the tour, changelog, theme prompt, Quick Start or the mobile coach marks.
**Scale/Scope**: 3 journeys of 2 to 4 steps, 4 UI components (1 new host, 2 new cards, 1 extended checklist), 3 shell control ids, 1 Help article.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status                          | How                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Library-First            | PASS                            | Journey types, schema, reducer and content live in `packages/onboarding-journey-engine`. The app holds only adapters, the store and UI (research R1).                                                                                            |
| II. TDD                     | PASS                            | The contracts list the required tests per unit. Tasks will put tests before implementation. Success and failure paths are covered (invalid action, missing target, storage failure, malformed progress).                                         |
| III. Simplicity & YAGNI     | PASS                            | Reuses the orchestrator, tour, runner, highlight service, quick prompts and existing events. No new tour, tip framework or event pipeline. P2 and P3 are excluded, and the progress shape only avoids blocking them.                             |
| IV. AI-First Extraction     | N/A                             | No extraction. Cif stays optional, and the Oracle is untouched.                                                                                                                                                                                  |
| V. Privacy & Client-Side    | PASS                            | Everything is local. Milestones are content-free by construction, and adapter tests assert that `content`, titles and ids are never read. No remote storage, so the exception is not invoked. No new analytics. `onboardingFunnel` is unchanged. |
| VI. Clean Implementation    | PASS                            | Style guide (Runes, semantic tokens, Iconify). Impacted-only validation (quickstart).                                                                                                                                                            |
| VII. User Documentation     | PASS                            | New `apps/web/src/lib/content/help/guided-setup.md` and a `help-engine` registry entry `guided-setup.ts`. See User Help Check.                                                                                                                   |
| VIII. DI                    | PASS                            | `JourneyStore` and the milestone adapter take storage, session storage, clock, buses, help context, runner and categories through constructors, with production defaults and an exported singleton.                                              |
| IX. Natural Language        | PASS                            | Copy reviewed against the plain-language rule. "Guided setup" is the user-facing name. Cif is "the guide to using Codex Cryptica".                                                                                                               |
| X. Coverage                 | PASS                            | The new package targets ≥ 70%. The orchestrator and stores keep or raise their floors.                                                                                                                                                           |
| XI. Agent Protocol          | PASS                            | Surgical edits listed below. Nothing unrelated is refactored.                                                                                                                                                                                    |
| XII. Labels over Tags       | N/A                             | No categorisation metadata introduced.                                                                                                                                                                                                           |
| XIII. Discovery Intent      | N/A                             | No public discovery page.                                                                                                                                                                                                                        |
| XIV. Bounded Responsibility | PASS, with a planned extraction | See below.                                                                                                                                                                                                                                       |

### Discovery Intent Check

N/A. This feature touches only in-app routes and components.

### Bounded Responsibility Check

- [x] Touched files over 500 lines (excluding tests and data):
  - `apps/web/src/routes/(app)/+layout.svelte` (807): **extraction planned**. The first-run decision effect (lines ~501 to 549) moves into the new `components/onboarding/OnboardingHost.svelte`. The layout only mounts `<OnboardingHost />`, so it gets smaller.
  - `apps/web/src/lib/components/GraphView.svelte` (869): it still holds one job, rendering the graph view and its overlays. This feature adds one `data-help-target` attribute to the existing FAB and one extra condition on the existing mobile coach-mark visibility. Both belong to that job. No new behaviour is added.
- [x] Files deliberately **not** touched to avoid widening them: `CampaignGeneratorModal.svelte` (847), `SearchModal.svelte` (598), `vault.svelte.ts` (981), `modal-ui.svelte.ts` (559). The milestones come from existing events instead (research R2).
- [x] The new behaviour has its own home: the reducer and content go in the new package. The app adapter, store and UI are new sibling modules under `apps/web/src/lib/app/onboarding/journey/` and `components/onboarding/`.
- [x] The orchestrator tests move with the decision table. The extracted host gets a component test for its wiring.

### User Help Check

- [x] Help article `guided-setup.md`: what guided setup is, the three goals, that it never changes your vault or needs AI, how to start, continue or stop it from Help → Getting Started, and how Cif differs from the Oracle.
- [x] A `help-engine` registry entry, so Cif can answer "How do I restart guided setup?"
- [x] No new `FeatureHint`. The journey card is the hint, and the epic forbids extra banners.

**Post-design re-check (after Phase 1)**: still PASS. The design adds no persistence beyond local keys, no network surface, and no change to what the Worker receives (`extraAvailable` applies to one validation call only). One finding fed back into the spec: the RPG GM journey now generates first and then adds a related entry. Because every Create goes through the generator, the old order would finish in one save (data-model "Why rpg-gm generates first"; spec Story 3 updated).

## Project Structure

### Documentation (this feature)

```text
specs/175-cif-guided-onboarding/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── journey-engine-api.md
│   ├── first-run-orchestrator.md
│   ├── guidance-shell-controls.md
│   └── ui-onboarding.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/onboarding-journey-engine/          # NEW
├── package.json                             # deps: help-engine, zod
├── src/
│   ├── index.ts
│   ├── types.ts                             # Goal, JourneyDefinition, StepDefinition, Milestone, JourneyProgress
│   ├── schema.ts                            # JourneyDefinitionSchema (+ refinements: after order, copy, quick prompts)
│   ├── progress.ts                          # start/resume/applyMilestone/skip/back/exit/currentStep/position
│   ├── categories.ts                        # category requirement resolution + anyEntryCopy
│   ├── persistence.ts                       # parseProgress (validate + migrate) / serializeProgress
│   └── journeys/
│       ├── index.ts                         # JOURNEYS, journeyForGoal
│       ├── worldbuilder.ts                  # data
│       ├── writer.ts                        # data
│       └── rpg-gm.ts                        # data
└── tests (co-located *.test.ts)

packages/help-engine/src/actions/
├── catalogue.ts                             # + SHELL_CONTROL_IDS, "shell" area, catalogue entries
└── validate.ts                              # + ActionDeps.extraAvailable, shell area bypass
packages/help-engine/src/registry/features/
└── guided-setup.ts                          # NEW registry entry

apps/web/src/lib/app/onboarding/
├── onboarding-orchestrator.ts               # goal-invitation kind, new state fields
└── journey/                                 # NEW
    ├── journey-milestones.ts                # adapter: vault bus / app bus / focus event / explorer → Milestone
    └── journey-store.svelte.ts              # DI store: progress per vault, session marker, showMe via runner
apps/web/src/lib/services/help-assistant/
└── help-action-runner.ts                    # run(action, { extraAvailable })
apps/web/src/lib/stores/ui/
├── onboarding.svelte.ts                     # goalInvitation, chosenGoal, transient firstRunGuidanceActive
└── persistence.ts                           # two UI_STORAGE_KEYS
apps/web/src/lib/components/onboarding/      # NEW
├── OnboardingHost.svelte                    # orchestrator effect (moved from layout) + mounts cards
├── GoalInvitation.svelte
└── JourneyCard.svelte
apps/web/src/lib/components/
├── help/GettingStartedChecklist.svelte      # Guided setup group
├── layout/AppHeader.svelte                  # data-help-target: create-entry, open-search
├── layout/ActivityBar.svelte                # data-help-target: activity-bar-graph
├── ui/EmptyState.svelte                     # optional ctaHelpTarget prop
├── graph/GraphEmptyState.svelte             # pass ctaHelpTarget="create-entry"
├── GraphView.svelte                         # FAB data-help-target; coach marks gated
└── explorer/EntityExplorer.svelte           # handleSelect → recordEntryFound()
apps/web/src/routes/(app)/+layout.svelte     # replace orchestrator effect with <OnboardingHost />; theme prompt uses isOnboarded() + firstRunGuidanceActive
apps/web/src/lib/content/help/guided-setup.md  # NEW article
apps/web/tests/
├── first-run-onboarding-e2e.spec.ts         # updated: invitation replaces auto tour
├── mobile-first-time-ux.spec.ts             # updated
├── help-onboarding.spec.ts                  # updated: Getting Started guided setup
└── guided-setup-journeys.spec.ts            # NEW: 3 journeys × viewports × AI on/off, zero-AI-request and vault-diff assertions
```

**Structure Decision**: The web app plus a new workspace package, following the `solo-session-engine` and `session-journal-engine` pattern (Library-First). The 48 existing E2E specs that seed `completedTours: ["initial-onboarding"]` keep skipping onboarding unchanged, because that flag still counts as onboarded.

## Delivery order

1. **Engine package** (types, schema, reducer, persistence, journeys) with tests. Nothing else depends on the UI.
2. **help-engine** shell controls and `extraAvailable`, plus the runner pass-through, with tests.
3. **Orchestrator** decision table, `OnboardingStore` fields, `OnboardingHost` extraction (layout behaviour unchanged except for the new kind).
4. **Milestone adapter and journey store** (DI, privacy tests, reload rule).
5. **UI**: `GoalInvitation`, `JourneyCard`, Getting Started group, `data-help-target` placements, coach-mark gating.
6. **Help article and registry entry.**
7. **E2E** updates and the new journey spec (the #4000 gate items for P1).

Stories 1 to 3 (P1) ship together. Story 4 (P2, Getting Started) lands in step 5 but is independently testable.

## Risks and mitigations

| Risk                                                                                                             | Mitigation                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A create path writes a different category id than expected (for example, the intent menu's "Place" → `location`) | The E2E asserts the category written per path. Steps accept a list of ids. The `anyEntryCopy` fallback covers it. |
| A journey card overlaps a highlight on small screens                                                             | The card repositions when it overlaps the highlight rect. Phone E2E asserts no overlap.                           |
| A Cif Worker version doesn't know the shell ids                                                                  | Shell ids are never sent. `extraAvailable` stays client-side (contract test).                                     |
| Existing first-run E2E tests expect the auto tour                                                                | Updated in step 7. The tour remains available from Explore and the Help replay.                                   |
| Structural suggestion banners (Guided Mode) appear during a journey                                              | Accepted for P1. Noted for #3998 so P2 reuses them instead of adding a parallel surface.                          |

## Complexity Tracking

No constitution violations. Nothing to justify.
