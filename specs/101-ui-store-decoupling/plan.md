# Implementation Plan: UI Store Decoupling

**Branch**: `101-ui-store-decoupling` | **Date**: 2026-05-19 | **Spec**: /specs/101-ui-store-decoupling/spec.md
**Input**: Feature specification from `/specs/101-ui-store-decoupling/spec.md`; analysis in `/docs/UI_STORE_ANALYSIS.md`

## Summary

Decompose the monolithic `UIStore` (872 lines, 45 state fields, 100 methods, 147 importers) into eight focused per-concern stores behind a temporary delegating facade, then sweep imports and delete the facade. Persistence concerns (57 inline `localStorage`/`window` calls) are centralized in a typed, injectable `UIPersistence` helper.

This is structurally identical to Specs 098 (P2P host service), 099 (map session store), and 100 (P2P guest service) — same facade-then-extract pattern, scaled up because the target file has more concerns and a far wider import surface.

## Technical Context

**Language/Version**: TypeScript 6.0.3
**Primary Dependencies**: Svelte 5 (Runes — `$state`, `$derived`), `@codex/events`
**Storage**: `localStorage` (UI preferences); no IndexedDB/OPFS involvement
**Testing**: Vitest
**Target Platform**: Browser (SvelteKit)
**Project Type**: Web Application (UI Store Refactor)
**Performance Goals**: No regression in interaction latency; reactive scope per consumer should shrink (subjectively verified during smoke tests).
**Constraints**: All existing `localStorage` keys preserved verbatim; every new store ≤ 200 lines; zero test regressions.
**Scale/Scope**: ~872 lines refactored into 8 focused stores + 1 persistence helper; 147 consumer files swept by codemod.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Each new store is a standalone module. [PASS]
2. **Test-Driven Development (TDD)**: Every new store has unit tests targeting ≥ 90 % coverage; `UIPersistence` injectability removes the need for `vi.stubGlobal("window", …)`. [PASS]
3. **Simplicity & YAGNI**: Reusing the proven facade-then-extract pattern; no novel abstractions. [PASS]
4. **Privacy & Client-Side Processing**: All state remains in the browser; no telemetry added. [PASS]
5. **Dependency Injection (DI)**: Each new store's constructor accepts `UIPersistence`. [PASS]
6. **Quality & Coverage**: Target ≥ 90 % per store (exceeds 70 % floor). [PASS]
7. **Agent Operational Protocol**: Surgical changes per phase; facade keeps consumers working between phases. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/101-ui-store-decoupling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/lib/stores/
├── ui.svelte.ts                 # During migration: thin facade (~80 lines). Deleted at end of Phase 8.
└── ui/
    ├── persistence.ts           # NEW: typed localStorage helper (injectable)
    ├── persistence.test.ts      # NEW
    ├── notification.svelte.ts   # NEW: toast / globalError / confirm
    ├── notification.test.ts     # NEW
    ├── onboarding.svelte.ts     # NEW
    ├── onboarding.test.ts       # NEW
    ├── session-mode.svelte.ts   # NEW: guest / demo / shared mode
    ├── session-mode.test.ts     # NEW
    ├── modal-ui.svelte.ts       # NEW: every dialog and modal
    ├── modal-ui.test.ts         # NEW
    ├── discovery-policy.svelte.ts # NEW
    ├── discovery-policy.test.ts # NEW
    ├── connection-mode.svelte.ts # NEW
    ├── connection-mode.test.ts  # NEW
    ├── explorer-ui.svelte.ts    # NEW
    ├── explorer-ui.test.ts      # NEW
    ├── layout-ui.svelte.ts      # NEW: sidebars, widths, mobile, focus
    └── layout-ui.test.ts        # NEW
```

**Structure Decision**: All new stores live under `stores/ui/` to make the split visible at a glance. The compatibility facade keeps the existing `stores/ui.svelte.ts` import path working until Phase 8.

## Migration Strategy

The phasing minimizes risk by starting with the smallest, highest-traffic surface (Notification) to prove the facade pattern, then moving outward. Each phase is independently mergeable and ships behind the same facade.

| Phase | Store                                                        | Importer hits                   | Rationale                                                                 |
| ----- | ------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| 3     | NotificationStore                                            | ~100 (notify + confirm + error) | Prove the pattern on the highest-frequency surface.                       |
| 4     | OnboardingStore + SessionModeStore                           | ~5 + ~80                        | Two small slices, low risk, exercises the persistence helper.             |
| 5     | ModalUIStore                                                 | ~20                             | Bounded surface; opening/closing modals doesn't intersect other concerns. |
| 6     | DiscoveryPolicyStore + ConnectionModeStore + ExplorerUIStore | ~25 + ~10 + ~10                 | Bundle independent feature slices for efficiency.                         |
| 7     | LayoutUIStore                                                | ~50                             | Largest single piece; done last after pattern is well-practiced.          |
| 8     | Facade removal + codemod sweep                               | 147 files                       | Mechanical rename; runs only after every slice has moved out.             |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — no violations.
