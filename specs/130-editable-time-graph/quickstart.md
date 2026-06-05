# Quickstart: Editable Time Graph

How to exercise the feature end-to-end once implemented. Assumes a dev vault with a few dated entities.

## Run

```bash
pnpm install
pnpm dev            # SvelteKit dev server (apps/web)
# package tests:
pnpm test           # vitest across workspace
pnpm run lint
```

## Happy path — drag an Event (US1, MVP)

1. Open the graph, enable **Timeline Mode** (existing control).
2. Toggle **Edit Chronology** (new). The graph shows a clear edit-mode indicator (FR-001/FR-007).
3. Grab an Event node and drag it horizontally; a live indicator shows the target year (e.g. "605 P.C.") (FR-010).
4. Release. A direct confirmation appears: **"Set event date to 605 P.C.?"** (FR-013).
5. Confirm → the Event's `date` updates and the node settles at the derived position.
6. Reload the vault → the new date persists (FR-022, SC-001).
7. Repeat but **cancel** at the confirmation → date unchanged, node returns to origin (FR-006).

## Semantic placement — drag a Character (US2)

1. In edit mode, drag a Character to ~580 P.C. and drop.
2. The **semantic placement popover** opens showing the name, target year, and Character meanings: Born / Died / Became active / Reign / Major appearance / Custom (FR-015/FR-016).
3. Pick **Born**, confirm. The popover states it will set the primary date (or a `born` anchor) before saving (FR-005). Verify the value persisted.
4. Drag a Faction → confirm the popover offers Founded / Dissolved / Active / Schism / Merger (different set) (US2 scenario 2).

## Range span (US3)

1. Drag an entity's range span 50 years later → confirmation shows the shifted range; save updates `start_date` **and** `end_date`.
2. Drag only the end edge → only `end_date` updates.
3. Try to drag the end before the start → save is blocked with a reason; metadata unchanged (FR-031).

## Multiple anchors (US4)

1. Take the Character from US2 (has a `born` primary). Grab its born point, drag, and in the confirmation choose **"create a new anchor instead"**, set type **Major appearance** at 621 P.C. (FR-009a).
2. The entity now renders at two points; neither overwrote the other (FR-023, FR-028, SC-004).
3. Add a third (`disappeared`, 634 P.C.). Remove one anchor → the others are unaffected (FR-024).

## Canon-safety checks

- In **view mode** (edit toggle off), dragging never changes temporal metadata (FR-002).
- Dropping on empty canvas / outside the axis cancels with no write (FR-012).
- If the entity's date changes via sync while the popover is open, saving surfaces a conflict instead of clobbering (FR-032).

## Automated test entry points

| Layer               | What to assert                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `schema`            | `TemporalAnchorSchema` validation + `Entity` back-compat (contract: schema.temporal-anchor)             |
| `chronology-engine` | meaning-sets per type, `validateRange`, `deriveProjectedAnchors`, `buildIntent`, `detectConflict`       |
| `graph-engine`      | `getYearForPosition` round-trip + `getAnchorTimelineLayout` keys                                        |
| `apps/web` store    | `ChronologyEditService` lifecycle: grab→drag→drop→confirm/cancel, restore-on-cancel, no-write-on-cancel |
| component           | `SemanticPlacementPopover` renders type-specific meanings; blocks save on invalid range                 |

## Done when

- All FR acceptance scenarios in `spec.md` pass.
- `pnpm test` + `pnpm run lint` green; new package logic ≥70% coverage (Constitution X).
- Help article + `FeatureHint` for Edit Chronology present (Constitution VII).
