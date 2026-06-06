# Implementation Plan: Editable Time Graph with Semantic Temporal Placement

**Branch**: `130-editable-time-graph` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/130-editable-time-graph/spec.md`

## Summary

Turn the existing read-only Timeline Mode (`026-world-timeline`) into a chronology **editing** tool. In an explicit _edit-chronology mode_, the user drags an entity (or one of its anchor points) horizontally along the time axis; a live indicator shows the resolved target year; on drop a canon-safe confirmation appears (direct for Events, a semantic meaning-selection popover for other types) and saving writes structured temporal metadata.

Per the clarifications: the existing flat `date`/`start_date`/`end_date` fields stay **authoritative for the primary** point/range (zero migration), and a new `temporalAnchors[]` collection on the entity holds **additional** meanings (multiple appearances, custom anchors). Each anchor renders as its own grabbable point; dragging one proposes updating it, with an "add new anchor instead" option. Undo is deferred this iteration; cancel-before-save is the safety net.

Entities not yet on the timeline (new/undated) are placed for the first time by **dragging them from the Entity Explorer onto the axis** (US6) — reusing the Explorer's existing `application/codex-entity` HTML5 drag source and routing the drop into the same confirmation flow. The confirmation can also **create a new linked Event** at the dropped time (US7), reusing `vault.createEntity` plus an anchor `linkedEntityId` and a connection — an explicit, additive, opt-in action.

Technical approach: keep all semantics and resolution logic in `packages/` (Library-First). `schema` gains the `TemporalAnchor` type and `temporalAnchors` field; `chronology-engine` gains entity-type → meaning-set mapping, anchor helpers, range validation, and **position↔year** resolution; `graph-engine` gains the inverse position→year mapping and per-anchor point projection. The Svelte layer in `apps/web` stays thin: an edit-mode toggle, in-graph drag handlers wired into the existing graph controller, a **canvas drop target** for Explorer drags, a live axis indicator, and a semantic placement popover that reuses the existing `TemporalPicker`. Saving routes through the existing `vault.updateEntity()` path (which already applies auto-Labels).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 (runes mode)
**Primary Dependencies**: Cytoscape.js (graph rendering/drag), `@floating-ui/dom` (popover positioning), Zod (schema validation); internal workspace packages `schema`, `chronology-engine`, `graph-engine`, `vault-engine`
**Storage**: Client-side only — entities persisted as Markdown + YAML frontmatter in OPFS; calendar/era config in IndexedDB. All writes via the existing vault store (`vault.updateEntity`)
**Testing**: Vitest (unit + property tests already exist in `chronology-engine`); `pnpm run lint` + `pnpm test` per Constitution VI
**Target Platform**: Browser (SvelteKit SPA, static deploy to GitHub Pages), offline-capable
**Project Type**: Web monorepo (`packages/*` libraries + `apps/web` thin UI)
**Performance Goals**: Drag interaction at 60 fps; timeline layout of 500+ dated nodes under 200 ms (inherited from `026`); position→year resolution O(1) per drag frame
**Constraints**: No AI dependency (explicit non-goal); no silent metadata mutation; client-side/private; no migration of existing vaults
**Scale/Scope**: Vaults up to several thousand entities; 7 entity types with distinct meaning sets; 0..N anchors per entity

No unresolved `NEEDS CLARIFICATION` — the three highest-impact ambiguities (storage model, drag target, undo scope) were resolved in `/speckit-clarify`. Remaining open design details (per-anchor cytoscape representation, position→year precision, touch/keyboard) are addressed in Phase 0 research, not blocking.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Status  | Notes                                                                                                                                                                                                                              |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First           | ✅ Pass | Anchor model (`schema`), meaning-sets + range validation + position↔year resolution (`chronology-engine`), per-anchor projection + inverse mapping (`graph-engine`). `apps/web` is a thin UI layer (toggle, drag wiring, popover). |
| II. TDD                    | ✅ Pass | Each package change starts with a failing Vitest spec (meaning-set mapping, anchor schema, range validation, position↔year round-trip). Red-Green-Refactor.                                                                        |
| III. Simplicity & YAGNI    | ✅ Pass | Reuse Cytoscape, existing `getTimelineLayout`, `TemporalPicker`, `@floating-ui/dom`. No new libraries. Undo + touch/keyboard deferred.                                                                                             |
| IV. AI-First Extraction    | ✅ N/A  | This is a manual, deterministic editing tool; AI-First governs the extraction pipeline, not direct-manipulation editing. Feature explicitly must work without AI (non-goal). Not a violation.                                      |
| V. Privacy & Client-Side   | ✅ Pass | All resolution and persistence are local (OPFS/IndexedDB); no network.                                                                                                                                                             |
| VI. Clean Implementation   | ✅ Pass | Svelte 5 runes, Tailwind 4 tokens, `@docs/STYLE_GUIDE.md`. Lint + tests gate completion.                                                                                                                                           |
| VII. User Documentation    | ✅ Pass | Add an `apps/web/src/lib/config/help-content.ts` article for "Edit Chronology"; add a `FeatureHint` for first-time edit-mode entry.                                                                                                |
| VIII. Dependency Injection | ✅ Pass | New `ChronologyEditService` (placement resolution + save) uses constructor DI with a production singleton default and injectable vault/calendar deps.                                                                              |
| IX. Natural Language       | ✅ Pass | Popover copy is plain ("Set temporal meaning", "Born", "Founded", "Set event date to 605 P.C.?").                                                                                                                                  |
| X. Quality & Coverage      | ✅ Pass | New package logic targets ≥70%; pure resolution/validation functions are highly testable.                                                                                                                                          |
| XII. Labels Over Tags      | ✅ Pass | Status implied by anchors (e.g. an end/`died` anchor → "past"/historical) flows through the existing `applyAutoLabels` on `vault.updateEntity`; rendered as **Labels**, never Tags.                                                |

**Result**: PASS. No violations → Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/130-editable-time-graph/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (package contracts)
│   ├── schema.temporal-anchor.md
│   ├── chronology-engine.placement.md
│   └── graph-engine.anchor-projection.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── schema/src/
│   └── entity.ts                     # ADD TemporalAnchorSchema + EntitySchema.temporalAnchors
├── chronology-engine/src/
│   ├── meaning-sets.ts               # NEW: entity-type → temporal-meaning catalogue + span/point classification
│   ├── anchors.ts                    # NEW: anchor CRUD helpers, primary↔anchor derivation, range validation
│   ├── placement.ts                  # NEW: resolve drag → {field|anchor} intent; conflict detection
│   └── engine.ts                     # REUSE: calendar/date validation; parseDirectDateInput
└── graph-engine/src/
    └── layouts/timeline.ts           # ADD getYearForPosition (inverse) + per-anchor point projection

apps/web/src/lib/
├── stores/
│   ├── graph.svelte.ts               # ADD chronologyEditMode state + actions
│   └── chronology-edit.svelte.ts     # NEW: ChronologyEditService (DI) — transient drag state, save routing
├── components/
│   ├── graph/
│   │   ├── graph-view-controller.svelte.ts  # WIRE: anchor-point drag handlers (grab/drag/dragfree) in edit mode
│   │   ├── ChronologyEditToggle.svelte      # NEW: mode toggle (lives near TimelineControls)
│   │   ├── ChronologyDragIndicator.svelte   # NEW: live target-year axis indicator
│   │   └── SemanticPlacementPopover.svelte  # NEW: meaning-selection confirmation (reuses TemporalPicker)
│   ├── GraphView.svelte              # WIRE: canvas dragover/drop target for Explorer entities (US6)
│   ├── graph/GraphHUD.svelte         # WIRE: view vs edit-chronology mode indicator (US5)
│   ├── graph/GraphToolbar.svelte     # WIRE: edit-mode affordance near timeline controls (US5)
│   ├── explorer/
│   │   └── EntityExplorer.svelte     # REUSE existing `application/codex-entity` drag source (US6)
│   └── timeline/
│       └── TemporalPicker.svelte     # REUSE for date/range field inside the popover
└── config/
    └── help-content.ts               # ADD "Edit Chronology" help article + FeatureHint
```

**Structure Decision**: Web monorepo. Library-First mandates that all temporal semantics, validation, and geometry live in `packages/` (`schema`, `chronology-engine`, `graph-engine`) with full unit/property coverage. `apps/web` only orchestrates: mode state, Cytoscape drag wiring, the popover UI, and routing saves through the existing `vault.updateEntity()`. This mirrors how `026-world-timeline` already split pure layout (`graph-engine/layouts/timeline.ts`) from UI (`TimelineControls.svelte`).

## Future Extensions (Phase 3): Visual Lifespans and Story Chains

Conceptual design modifications to support advanced temporal visualization layout (deferred, not for active implementation):

### Packages

#### `graph-engine`

- **Span Connector Layout**: Extend `getTimelineLayout` and LayoutManager to compute visual connecting span paths/lines between start and end node handles.
- **Narrative Sequence Filter**: Filter out standard non-chronological edges (e.g. `allied_with`) in timeline mode, leaving only sequential narrative edges (e.g. `precedes`, `leads_to`).
- **Storyline Swimlanes**: Organize parallel or concurrent sequence chains into layered horizontal swimlanes to keep visual pathways clean.

### Svelte Layer (apps/web)

- **Unified Span Gestures**: Update the graph-view-controller to recognize drags on the connecting span lines (translates the entire range) vs boundary nodes (resizes range).
- **Theme-specific Spans**: Style connecting span paths according to active vault theme parameters (fantasy calligraphies vs. scifi digital lines).

## Complexity Tracking

> No Constitution violations — section intentionally empty.
