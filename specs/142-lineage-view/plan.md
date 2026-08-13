# Implementation Plan: Lineage View (full multi-generation family tree)

**Branch**: `142-lineage-view` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/142-lineage-view/spec.md`
**Source**: GitHub issue #1716

## Summary

Add an opt-in, view-only "Lineage" mode to the existing full-screen family dialog that renders a character's entire recorded direct line (all ancestor generations, all descendant generations, partners beside direct-line members) plus collapsed-by-default sibling branches at every generation, on a pannable/zoomable canvas with per-branch collapse at any depth, an initial generation-depth cap, and a one-action "Expand all".

Technical approach: a new pure traversal function `buildLineage()` plus a pure deterministic layout function `layoutLineage()` in the existing `@codex/family-engine` package (Constitution I), rendered by a new `LineageView.svelte` that absolutely positions the existing `FamilyMemberCard` cards inside a new lightweight pan/zoom container (pointer-events pan, wheel zoom reusing the map's pure `getZoomViewportUpdate` helper, two-pointer pinch). No cytoscape, no new persisted data — same decision family as 1702's "deterministic layout, no physics engine".

## Technical Context

**Language/Version**: TypeScript 6.0.3 (repo-pinned, tsgo via `lint:types:fast`), Svelte 5 (runes)
**Primary Dependencies**: `@codex/family-engine` (extended), `schema` (Entity types), existing `FamilyMemberCard.svelte`; map's pure `getZoomViewportUpdate` from `apps/web/src/lib/components/map/map-view-helpers.ts` for wheel-zoom math. No new external dependencies.
**Storage**: None — lineage is derived at view time from entity connections (FR-012). Collapse/expand and mode state are transient component state.
**Testing**: `bun test` (vitest workspace) — unit tests in `packages/family-engine`, component tests alongside the Svelte files as in 1702; `bun run lint` + `bun run test` gate (Constitution VI.3).
**Target Platform**: Web (desktop + mobile browsers), client-side only (Constitution V)
**Project Type**: Monorepo web app — `packages/` engine + `apps/web` thin UI layer
**Performance Goals**: 200-member dynasty opens without freezing; pan/zoom/collapse/re-centre respond < 1 s (SC-003); traversal + layout are O(members) single passes
**Constraints**: View-only in v1 (FR-013); depth cap N on initial render with expanders + Expand all (FR-010/FR-010a); cycle-safe traversal (FR-011); no horizontal page overflow on mobile (FR-014)
**Scale/Scope**: Dynasties up to a few hundred recorded members; one new engine module pair, one new canvas component, one new view component, mode toggle in the existing full-screen dialog

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #    | Principle                | Status | Notes                                                                                                                                                                                                                                                 |
| ---- | ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I    | Library-First            | ✅     | Traversal + layout live in `packages/family-engine` as pure functions; `apps/web` only renders.                                                                                                                                                       |
| II   | TDD                      | ✅     | Engine functions and layout are pure → unit-test-first. Component tests for mode toggle, collapse, expand-all mirror 1702's test layout.                                                                                                              |
| III  | Simplicity & YAGNI / DRY | ✅     | Reuses `FamilyMemberCard`, existing family connection model, existing `<dialog>` surface, and the map's pure zoom helper instead of a new pan/zoom library. No cytoscape (deterministic genealogy layout, per 1702 research Decision 4). No new deps. |
| IV   | AI-First Extraction      | N/A    | No AI involvement in this feature (spec assumption).                                                                                                                                                                                                  |
| V    | Privacy & Client-Side    | ✅     | Entirely client-side derivation and rendering.                                                                                                                                                                                                        |
| VI   | Clean Implementation     | ✅     | Svelte 5 runes, Tailwind theme tokens, `bun run lint`/`test` before completion.                                                                                                                                                                       |
| VII  | User Documentation       | ✅     | Plan includes a help-content entry + `FeatureHint` for first-time Lineage mode use.                                                                                                                                                                   |
| VIII | Dependency Injection     | ✅     | No new services/stores; pure functions + component props. If interaction state grows into a class (like `MapInteractionManager`), it takes overrides via constructor.                                                                                 |
| IX   | Natural Language         | ✅     | UI label "Lineage" (clarified); copy like "Show all generations", "N more generations".                                                                                                                                                               |
| X    | Coverage                 | ✅     | New engine logic targets ≥ 70% (engine goal); layout/traversal pure functions make this cheap.                                                                                                                                                        |
| XI   | Karpathy Rules           | ✅     | Surgical: `DetailFamilyTab` gains a mode toggle; `FamilyTree.svelte` (bounded view) untouched (SC-006).                                                                                                                                               |
| XII  | Labels over Tags         | ✅     | Reuses existing gender/role label reading via `toMember`; nothing new stored.                                                                                                                                                                         |

**Gate result**: PASS — no violations, Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/142-lineage-view/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── lineage-engine.md  # Engine API contract
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
packages/family-engine/src/
├── family-types.ts          # (unchanged) connection kinds + inverses
├── family-tree.ts           # (unchanged bounded view; shared helpers exported for reuse)
├── lineage.ts               # NEW: buildLineage(focusId, entities, opts) traversal
├── lineage.test.ts          # NEW: traversal, sibling branches, cycles, depth cap
├── lineage-layout.ts        # NEW: layoutLineage(lineage, opts) → positioned nodes/edges
├── lineage-layout.test.ts   # NEW: generation rows, couple adjacency, no overlaps
└── index.ts                 # export new API

apps/web/src/lib/components/entity-detail/
├── DetailFamilyTab.svelte           # MODIFIED: mode toggle in fullscreen dialog toolbar
└── family-tree/
    ├── FamilyMemberCard.svelte      # (reused as-is, view-only props already fit)
    ├── LineageView.svelte           # NEW: renders positioned cards + connector edges,
    │                                #      branch collapse/expand, depth expanders, Expand all
    ├── LineageView.test.ts          # NEW
    ├── PanZoomContainer.svelte      # NEW: pointer pan, wheel zoom, pinch zoom wrapper
    ├── pan-zoom.svelte.ts           # NEW: interaction state (pure math delegated/reused)
    └── pan-zoom.test.ts             # NEW

apps/web/src/lib/config/help-content.ts  # MODIFIED: Lineage mode help entry (Constitution VII)
```

**Structure Decision**: Extend the existing `@codex/family-engine` package rather than creating a new package — lineage is the same domain, same inputs, and reuses `toMember`/`relatedMembers` internals (Constitution III DRY). UI additions live beside the 1702 family-tree components; the bounded `FamilyTree.svelte` is not modified.

## Design Decisions (summary — details in research.md)

1. **Traversal (`buildLineage`)**: BFS from focus — upward via `child_of` links per generation, downward via `parent_of`; partners via `spouse_of` on each direct-line member; sibling branches = other children of each direct-line member (plus explicit `sibling_of` links at the focus generation). Visited-set guarantees termination on cycles (FR-011); each person materialises once, extra reaches become secondary edges.
2. **Layout (`layoutLineage`)**: deterministic tidy-tree-style pass producing absolute `{x, y}` per card and polyline edges, one row per generation. Pure function → unit-testable, no physics (mirrors 1702 Decision 4 at dynasty scale).
3. **Canvas**: DOM cards absolutely positioned inside a `transform: translate(…) scale(…)` layer; SVG layer beneath for connector edges. No `<canvas>` bitmap — card reuse, theming, and a11y come free; 200 cards is comfortably within DOM budget.
4. **Pan/zoom**: new small `PanZoomContainer` using Pointer Events (`setPointerCapture`), wheel zoom about the cursor via the map's pure `getZoomViewportUpdate`, two-pointer pinch from pointer tracking. Map's `MapInteractionManager` itself is too store-coupled to reuse.
5. **Depth cap & Expand all (FR-010/010a)**: `buildLineage` accepts `{ maxDepthUp, maxDepthDown }` and reports `truncated` boundaries; the view renders "N more generations" expanders at cut points and an "Expand all" toolbar action that re-runs traversal uncapped and expands all sibling branches, keeping the app responsive (traversal is O(members); rendering batched by Svelte).
6. **Mode toggle**: lives in the existing fullscreen `<dialog>` toolbar in `DetailFamilyTab.svelte` ("Family | Lineage" segmented control, only in fullscreen — FR-001). Both `EntityDetailPanel` and `ZenView` consume `DetailFamilyTab`, so both surfaces get it with one change.
7. **View-only**: `LineageView` renders cards without edit slots/actions; card actions = open entity, re-centre (FR-013). `EmptyFamilySlot` row is not rendered in Lineage mode.

## Complexity Tracking

No constitution violations — table intentionally empty.
