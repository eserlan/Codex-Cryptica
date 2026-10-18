# Implementation Plan: Cif Contextual Tips

**Branch**: `176-cif-contextual-tips` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/176-cif-contextual-tips/spec.md`

## Summary

Add the one opt-in **Show tips from Cif** setting and a single, dismissible "Cif has a tip" chip that suggests a goal-relevant next capability after guided setup is finished or left. The chip is decided by a pure function over the chosen goal, the screen area, a fixed tip catalogue, local tip history and a set of "do not interrupt" flags. Showing it sends nothing; tapping it asks Cif a verified quick prompt through the path the journey card already uses (Cif's own fallback supplies the static guide). Consent is explicit: the switch in Settings, or a one-time inline question when guided setup ends.

Technical approach: put the catalogue and the decision function in the existing framework-free `packages/onboarding-journey-engine` (no new package), add a `TipsStore` in `apps/web/src/lib/app/onboarding/tips/` with injected storage, and add three small components (`CifTipChip`, `TipsOptIn`, `CifTipsSetting`) mounted by the existing `OnboardingHost` and `AISettings`. Everything else is reused.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `onboarding-journey-engine` (extended), `help-engine` (`QUICK_PROMPT_SETS`, `FEATURE_REGISTRY`, `HelpArea`), `JourneyStore` (read-only outcome), `OnboardingStore` (`chosenGoal`, `goalInvitation`), `helpAssistant` and `cifPopout` (open and ask), `isHelpAssistantAvailable`, `helpStore` (tour), `modalUIStore` (dialogs), Floating UI (already a dependency), Tailwind 4 semantic tokens, Iconify classes. No new third-party dependency.
**Storage**: `localStorage` through the injected `StorageLike`: `codex-cif-tips` (preference, opt-in answer, tip history; device-wide). `sessionStorage`: `codex-cif-tips-session` (a tip was shown this session). No IndexedDB, OPFS or vault schema change, so no migration.
**Testing**: Vitest (package and web), Testing Library for components, one Playwright smoke for the chip on phone and desktop widths.
**Target Platform**: Browser, desktop, tablet and phone; keyboard and screen reader.
**Project Type**: Web application with internal framework-free packages.
**Performance Goals**: Tip decision is a pure function over a handful of values; it MUST run in under 1 ms (checked in `tests/budgets.test.ts`) and add no network call. The engine package stays under its existing 10 KB gzipped budget (currently about 3.2 KB).
**Constraints**: No AI or network request on show; no vault reads; no telemetry; no focus moves; reduced motion honoured.
**Scale/Scope**: About 9 catalogue tips (3 per goal), 1 setting, 1 chip, 1 opt-in card.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                | Status | Notes                                                                                                                                 |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-first         | Pass   | Catalogue and decision logic live in `packages/onboarding-journey-engine`, framework-free.                                            |
| II. TDD                  | Pass   | Engine tests first (decision matrix, catalogue integrity), then store and component tests.                                            |
| III. Simplicity / YAGNI  | Pass   | No new package, no new store family, no scheduler. One setting, one chip, one question.                                               |
| IV. AI-first extraction  | N/A    | No AI output; tapping reuses existing Cif. Aligned with the "AI first-class with guardrails" preference.                              |
| V. Privacy / client-side | Pass   | Device-local only; no vault reads; no telemetry. Matches the vault privacy boundary: nothing inside the authenticated app is tracked. |
| VI. Clean implementation | Pass   | Reuses `isEditable`, `restoreFocus`, `StorageLike`, `runtime-deps`.                                                                   |
| VII. User documentation  | Pass   | Extends the `guided-setup` help article and registry entry with a "Tips from Cif" section.                                            |
| VIII. DI                 | Pass   | `TipsStore` takes storage, clock, and getters through its constructor.                                                                |
| IX. Natural language     | Pass   | Plain copy in British English.                                                                                                        |
| X. Quality and coverage  | Pass   | Coverage for engine at 100% lines; impacted-only validation per AGENTS.md.                                                            |
| XII. Labels over tags    | Pass   | No tag terminology.                                                                                                                   |

### Discovery Intent Check

N/A. No public indexable page is added or repositioned.

### Bounded Responsibility Check

Files touched that already exist, by size: `journey-store.svelte.ts` (419 lines, one small read-only getter added, stays under 500), `AISettings.svelte` (398, one child component mounted), `OnboardingHost.svelte` (160), `onboarding-journey-engine/src/index.ts` (exports). No file crosses 500 lines. New behaviour lives in new files: `tips.ts` in the engine, `tips-store.svelte.ts` and `tips-runtime.ts` in the app. No decomposition needed.

### User Help Check

- [x] The `guided-setup` help article gains a "Tips from Cif" section: what tips are, where the switch is, what they never do, how to stop them.
- [x] The `guided-setup` registry entry (`packages/help-engine/src/registry/features/guided-setup.ts`) gains the facts so Cif can answer "how do I turn off tips".
- [x] No `FeatureHint`: it would compete with the chip, which is the whole point of this feature.

**Post-design re-check**: all gates still pass; see [research.md](./research.md) D1 to D8 for the decisions that kept the design inside them.

## Project Structure

### Documentation (this feature)

```text
specs/176-cif-contextual-tips/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tips-contract.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks, not created here
```

### Source Code (repository root)

```text
packages/onboarding-journey-engine/
├── src/
│   ├── tips.ts                    # NEW: catalogue, TipHistory, decideTip(), history transitions
│   └── index.ts                   # export the tips API
└── tests/
    ├── tips.test.ts               # NEW: decision matrix, quiet rules, dismissal, one-per-session
    └── tips-catalogue.test.ts     # NEW: every tip resolves to a registered feature and a verified quick prompt

apps/web/src/lib/
├── app/onboarding/tips/
│   ├── tips-store.svelte.ts       # NEW: reactive state, persistence, opt-in, dismiss, act
│   ├── tips-runtime.ts            # NEW: production wiring (storage, clock, Cif ask)
│   └── tips-store.test.ts         # NEW
├── components/onboarding/
│   ├── CifTipChip.svelte          # NEW: the chip
│   ├── TipsOptIn.svelte           # NEW: the one-time question
│   ├── CifTipChip.test.ts         # NEW
│   ├── TipsOptIn.test.ts          # NEW
│   └── OnboardingHost.svelte      # EDIT: mount chip and opt-in; supply blocker flags
├── components/settings/
│   ├── CifTipsSetting.svelte      # NEW: the switch and its explanation
│   ├── CifTipsSetting.test.ts     # NEW
│   └── AISettings.svelte          # EDIT: mount CifTipsSetting
├── app/onboarding/journey/
│   └── journey-store.svelte.ts    # EDIT: expose read-only `setupEnded` (finished or exited)
└── content/help/guided-setup.md   # EDIT: "Tips from Cif" section

packages/help-engine/src/registry/features/guided-setup.ts   # EDIT: facts for Cif

apps/web/tests/                    # Playwright smoke for the chip at phone and desktop widths
```

**Structure Decision**: Extend the existing engine package and the existing `app/onboarding` folder rather than adding a package. The engine already owns `Goal`, the journey definitions and progress, and already depends on `help-engine`, so the catalogue can be checked against quick prompts without a new dependency edge.

## Complexity Tracking

No constitution violations to justify.
