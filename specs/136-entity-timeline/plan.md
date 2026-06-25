# Implementation Plan: Entity Timeline (MVP)

**Branch**: `136-entity-timeline` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/136-entity-timeline/spec.md`

## Summary

Add a read-only **Timeline** tab to the entity detail panel that lists the events directly linked to the current entity, sorted earliest → latest, with undated events grouped at the end. Per the constitution's Library-First principle, the pure "resolve + sort + group linked events" logic lives in `packages/chronology-engine` (reusing `CalendarEngine` for date validity, sort keys, and formatting). The web app adds a thin Svelte 5 tab component (`DetailTimelineTab.svelte`) plus a small DI-friendly view-model that pulls candidate events from the vault store. No new date model, no mutations, no new linking mechanics — it reads existing `Entity.connections` and `type === "event"` entities.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5 (Runes mode)  
**Primary Dependencies**: `chronology-engine` (CalendarEngine: `isValid`, `getTimelineValue`, `format`), `schema` (`Entity`, `Connection`), existing `vault` store, Tailwind 4 theme tokens  
**Storage**: Existing client-side OPFS vault — **read-only** for this feature (no writes)  
**Testing**: Vitest (`bun run test`) for unit + Svelte component tests; Playwright (`apps/web/tests/*.spec.ts`) for the navigate-to-event flow  
**Target Platform**: Web (SvelteKit SPA), offline-capable, fully client-side  
**Project Type**: Monorepo — `packages/*` libraries + `apps/web` thin UI layer  
**Performance Goals**: Timeline renders without perceptible jank for an entity with up to ~hundreds of linked events; building the list is O(N) over vault entities, computed in a `$derived`  
**Constraints**: Strictly read-only (FR-010); no fabricated dates (FR-009); offline/client-side (Principle V); Svelte 5 runes + Tailwind tokens (Principle VI)  
**Scale/Scope**: Per-entity linked-event counts typically < 100; one new tab, one new engine module, one help entry

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Status  | Notes                                                                                                                                                                                                          |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First           | ✅ Pass | Sorting/grouping/link-resolution logic goes in `packages/chronology-engine` (`entity-timeline.ts`); `apps/web` is a thin UI layer over it.                                                                     |
| II. TDD                    | ✅ Pass | Red-Green-Refactor: write failing tests for `buildEntityTimeline` (sort order, undated grouping, range handling, direct-link only) and `DetailTimelineTab` (empty state, click-to-open) before implementation. |
| III. Simplicity & YAGNI    | ✅ Pass | Reuses `CalendarEngine` + existing `CalendarEventEntry` shape; no pagination, no virtualization, no new date model (clarified scope).                                                                          |
| V. Privacy & Client-Side   | ✅ Pass | Pure client-side read of in-memory vault; no network.                                                                                                                                                          |
| VI. Clean Implementation   | ✅ Pass | Svelte 5 runes, Tailwind theme tokens, `_`-prefixed unused params; verified with `bun run lint` + `bun run test`.                                                                                              |
| VII. User Documentation    | ✅ Pass | Add a help entry in `apps/web/src/lib/config/help-content.ts`; consider a `FeatureHint` for first-time discovery.                                                                                              |
| VIII. Dependency Injection | ✅ Pass | View-model/store takes vault + calendar deps via constructor with production defaults; tests inject mocks.                                                                                                     |
| IX. Natural Language       | ✅ Pass | Empty-state copy is plain ("No linked events yet…").                                                                                                                                                           |
| X. Quality & Coverage      | ✅ Pass | New engine module targets ≥70%; pure functions make this cheap.                                                                                                                                                |
| XII. Labels over Tags      | ✅ Pass | Event metadata surfaced as Labels, never "Tags".                                                                                                                                                               |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/136-entity-timeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── build-entity-timeline.md   # Function/UI contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
packages/chronology-engine/src/
├── entity-timeline.ts             # NEW: buildEntityTimeline() — pure resolve+sort+group
├── entity-timeline.test.ts        # NEW: unit tests (sort, undated, ranges, direct-link)
├── types.ts                       # EXTEND: EntityTimelineGroup / EntityTimelineRow types
└── index.ts                       # EXTEND: re-export new module

apps/web/src/lib/components/entity-detail/
├── detail-tabs.ts                 # EDIT: add "timeline" to entityDetailTabs
├── DetailTabs.svelte              # EDIT: add Timeline tab button (a11y: role=tab)
├── DetailTimelineTab.svelte       # NEW: the read-only timeline panel
├── DetailTimelineTab.test.ts      # NEW: empty state, grouping, click-to-open
└── entity-timeline-view.ts        # NEW (optional): thin DI view-model resolving linked events from vault

apps/web/src/lib/components/EntityDetailPanel.svelte  # EDIT: render DetailTimelineTab when activeTab === "timeline"
apps/web/src/lib/config/help-content.ts               # EDIT: add "timeline" help entry (Principle VII)
apps/web/tests/entity-timeline.spec.ts                # NEW: Playwright — open tab, click event → event page
```

**Structure Decision**: Monorepo web-app layout. The reusable, fully-testable core (`buildEntityTimeline`) is a new module in the existing `chronology-engine` package (Library-First). The web app adds one tab component and wires it into the existing `DetailTabs.svelte` / `EntityDetailPanel.svelte` tab system (tab registry in `detail-tabs.ts`). The same tab also surfaces in `ZenView.svelte` if it reuses the registry — confirmed as a follow-up check in Phase 0, but MVP target is `EntityDetailPanel`.

## Phase 0 — Research

See [research.md](./research.md). Key resolved unknowns:

- **Link resolution (direct, bidirectional)**: events linked to entity X = events that appear in `X.connections[].target` **plus** events whose own `connections[].target === X.id`. One hop only (clarified). Build a single pass over `vault.allEntities`.
- **Date model reuse**: use `CalendarEngine.getTimelineValue()` for the sort key and `format()` for display; `isValid()` decides dated vs. undated. Mirror the existing `toCalendarEntry()` pattern in `timeline.svelte.ts` rather than inventing a new shape.
- **Date ranges**: an event with `start_date`/`end_date` sorts by `start_date` (fallback `date`, then `end_date`); display shows the range via `getTemporalLabel()` conventions.
- **Undated grouping**: events where no date field is valid go to a single trailing "Undated" group; no `sortKey` fabricated.

## Phase 1 — Design & Contracts

- **Data model**: [data-model.md](./data-model.md) — `EntityTimelineRow`, `EntityTimelineGroup`, and the `buildEntityTimeline` input/output.
- **Contract**: [contracts/build-entity-timeline.md](./contracts/build-entity-timeline.md) — the engine function signature + the tab's UI contract (props, empty state, click behavior).
- **Quickstart**: [quickstart.md](./quickstart.md) — how to run, test, and manually verify against acceptance criteria.
- **Agent context**: `AGENTS.md` SPECKIT markers updated to reference this plan.

## Complexity Tracking

No constitution violations; no entries required.
