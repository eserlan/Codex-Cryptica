# Phase 0 Research: Editable Time Graph

This phase resolves the open design details left after `/speckit-clarify` (the three big ambiguities — storage model, drag target, undo scope — are already decided in the spec's Clarifications). Each item records Decision / Rationale / Alternatives.

## R1. Position → year resolution (inverse of the timeline layout)

**Decision**: Add a pure `getYearForPosition(position, context)` to `graph-engine/src/layouts/timeline.ts`, where `context` carries the same `{ yearPositions, scale, axis, minYear }` already computed by `getSequentialYearPositions`. Resolve a dropped pixel coordinate to the nearest year by inverting the sequential/gap-compressed mapping: find the bracketing year stops and linearly interpolate, then round to a whole year (the axis is year-granular by default).

**Rationale**: The existing forward layout is deterministic and already groups by year with gap compression. Reusing the same `yearPositions` map guarantees that a node dropped where year _Y_ sits resolves back to _Y_ (round-trip stable — required by SC-008 and FR-011). Keeping it pure keeps it testable (round-trip property test) and avoids coupling to Cytoscape.

**Alternatives considered**:

- _Uniform pixels-per-year inversion_ (ignore gap compression): rejected — would mis-resolve in compressed gaps, breaking round-trip stability.
- _Read the year off the nearest existing node_: rejected — fails when dropping into empty regions or creating a brand-new date.

## R2. Per-anchor rendering of multi-anchor entities in Cytoscape

**Decision**: In timeline/edit mode, project each anchor to a **synthetic anchor node** keyed `"<entityId>::<anchorId>"`, parented/visually linked to the source entity, positioned by its own resolved year. The primary (legacy-field) value is projected as the anchor with a reserved id (`"<entityId>::primary"`). Organic (non-timeline) mode is unchanged — entities remain single nodes. Projection lives in `graph-engine`; the controller materialises/removes synthetic nodes only while in timeline edit/view.

**Rationale**: FR-009a needs each anchor individually grabbable, and FR-028 needs each anchor at its own position. Synthetic nodes give Cytoscape real drag targets per anchor without polluting the persisted graph or organic layout. Namespacing the id lets drag handlers recover `(entityId, anchorId)` trivially. Building it in `graph-engine` keeps the projection unit-testable.

**Alternatives considered**:

- _Single node + custom canvas glyphs for extra anchors_: rejected — extra points wouldn't be native drag targets; we'd reimplement hit-testing (violates YAGNI/Simplicity).
- _Persisting anchor nodes as real entities_: rejected — anchors are metadata of one entity, not separate nodes; would corrupt the graph and connection model.

## R3. Drag interaction states & canon safety wiring

**Decision**: Drive everything off a new `graph.chronologyEditMode` boolean (separate from `timelineMode`). Edit mode requires timeline mode to be on. Cytoscape node `grabify`/dragging stays **disabled for temporal mutation** unless `chronologyEditMode` is true. Handlers: `grab` records the source `(entityId, anchorId)` + origin position into the transient `ChronologyEditService` state; `drag` updates the live target year (R1) for `ChronologyDragIndicator`; `dragfree` (drop) resolves the intent and opens the confirmation — it does **not** write. The write happens only on explicit confirm. Any of {cancel, Escape, drop on invalid target (R1 returns null), leaving edit mode} restores the node to origin and clears transient state with no write (FR-006, FR-012, edge cases).

**Rationale**: A single explicit mode flag makes "are we editing lore?" unambiguous for both the guard logic and the UI affordance (FR-001/FR-007). Resolving on `dragfree` but writing only on confirm enforces FR-004 (no silent mutation) structurally.

**Alternatives considered**:

- _Write on drop, offer undo_: rejected — undo is deferred and this violates the no-silent-mutation rule.
- _Reuse `timelineMode` as the edit flag_: rejected — view mode must stay safe/deterministic (FR-002); they are distinct states.

## R4. Mapping entity types to semantic meanings

**Decision**: A static, data-driven catalogue in `chronology-engine/src/meaning-sets.ts`: `Record<entityType, Meaning[]>`, each `Meaning` = `{ id, label, kind: 'point'|'span', target: 'date'|'start_date'|'end_date'|'anchor', anchorType? }`. Events map their meanings to **legacy fields** (`date`; `start_date`/`end_date`); Character/Faction/Location/Item/Note map most meanings to **anchors** (with a designated "primary"/`begin` meaning that writes the legacy `date`). Every type also gets a universal **Custom anchor** meaning. Entity _type_ is matched against the vault's category ids (`character`, `faction`, `location`, `item`, `event`, `note`). **There is no `period` category** — date ranges are `start_date`/`end_date` on any type (US3). Unmatched types — the default `creature` and any user-defined category — fall back to a generic set (`date` begin point, `start_date`/`end_date` range, custom).

**Rationale**: Centralises FR-016/FR-017 in one tested table, keeps the popover dumb, and encodes the hybrid storage decision (which meanings hit legacy fields vs anchors) declaratively. Matching category ids reuses the existing `DEFAULT_CATEGORIES` taxonomy (`schema`) so user-renamed labels still resolve.

**Alternatives considered**:

- _Hard-code meanings inside the popover component_: rejected — violates Library-First and isn't unit-testable.
- _Free-form meanings only_: rejected — loses the entity-type-specific suggestions the spec requires (FR-016, SC-003).

## R5. Temporal value shape for anchors

**Decision**: Anchor dates use the schema's existing `TemporalMetadata`/`DateSelection` union (year-precision minimum), **not** free-form strings (the issue's `"580 PC"` examples are display forms). The popover's date field reuses `TemporalPicker`, which already converts between legacy `TemporalMetadata` and `DateSelection` and honours the active calendar (`calendarStore`).

**Rationale**: Consistency with `entity.date` (FR-021) means anchors sort, position, and validate using the same `calendarEngine` logic with zero new date-parsing. Reusing `TemporalPicker` satisfies the "show target year, confirm value" UX with no new component.

**Alternatives considered**:

- _Store raw strings ("604 P.C.")_: rejected — unsortable, unvalidatable, and inconsistent with existing fields; would need a parallel parser.

## R6. Range validation & conflict detection

**Decision**: `chronology-engine/src/anchors.ts` exposes `validateRange(start, end)` (rejects end < start, returning a typed reason) and `placement.ts` exposes `detectConflict(originalValue, currentEntityValue)` comparing the value captured at drag-start against the entity's value at save time (using `calendarEngine` equality). The popover blocks save on invalid range (FR-031) and surfaces a conflict prompt instead of overwriting when the entity changed underneath (FR-032).

**Rationale**: Pure functions for both keep FR-031/FR-032 testable and UI-agnostic. Capturing the original at drag-start is cheap (already in transient state) and gives a deterministic conflict check without a new locking mechanism.

**Alternatives considered**:

- _Last-write-wins_: rejected — violates FR-032 (silent clobber on concurrent sync edit).
- _Optimistic version numbers on every field_: rejected as over-engineering for this iteration (YAGNI); value-equality is sufficient.

## R7. Linked-entity anchors & graceful degradation

**Decision**: An anchor's optional `linkedEntityId` is a soft reference. Projection (R2) and the detail view check existence at render time; a dangling link renders the anchor as a plain dated point with a "broken link" affordance (FR-033) and never throws.

**Rationale**: Matches the existing connection model's tolerance for missing targets and satisfies the deletion edge case without cascade bookkeeping.

**Alternatives considered**:

- _Cascade-delete anchors when the linked entity is removed_: rejected — anchors belong to their host entity; the date is still meaningful without the link.

## R8. Persistence & auto-Labels

**Decision**: All writes go through `vault.updateEntity(id, { date | start_date | end_date | temporalAnchors })`. No new persistence path. The existing `applyAutoLabels` (in `vault/entities.ts`) continues to derive status Labels (e.g. `past`) from `end_date`; anchor-implied status reuses the same hook (extend `applyAutoLabels` only if an anchor type must influence a Label — kept minimal, Constitution XII).

**Rationale**: Reuses the canonical, already-tested save + frontmatter + sync pipeline (Simplicity/Privacy), and keeps Label derivation in one place.

**Alternatives considered**:

- _Direct OPFS writes from the edit service_: rejected — bypasses validation, sync, and auto-Labels.

## R11. Gesture shape → point vs span

**Decision**: For in-canvas drags, derive point-vs-span from the gesture: track `pressYear` at grab/press and `targetYear` live; once the swept horizontal distance exceeds a small threshold (a few pixels / ≥1 resolved year), mark the gesture `'span'` (start = `pressYear`, end = `targetYear`), otherwise `'point'`. The confirmation defaults to the entity type's span vs point meanings accordingly but the user can still change the meaning. Explorer→timeline drops always resolve to a `'point'` (the external HTML5 drag ends on release), with span ends set in the popover (R10, FR-011b).

**Refinement (begin/end roles)**: A point drop is not a _different kind_ of thing from a span start — it is the entity's **begin** moment, expressed with the category-correct word (Event `date`, Character `born`, Faction `founded`, Location `founded`, Item `created`, Note `associated date`). Dragging out a width adds the **end** counterpart (`end date` / `died` / `dissolved` / `destroyed` / `lost`). So each meaning set marks one `role: 'begin'` and (where applicable) one `role: 'end'` meaning (FR-016a); a point gesture defaults to `begin`, a span gesture to `begin→end`. This makes "drop = when it started, drag = when it ended" literally true while keeping the right vocabulary per type. The popover still lets the user pick any other meaning (appearance, reign, schism, discovered).

**Rationale**: Lets the user "draw the duration" in one natural motion where the surface allows it (in-canvas), with plain drops setting the begin moment (not a wrongly open-ended range). The meaning popover still owns semantics, so the gesture is a hint, not a silent decision (FR-011a, FR-004). Unifies US3 (Period range) with the general drag model.

**Alternatives considered**:

- _Drop always = start of a range_: rejected — most primary meanings are points (Event date, born, founded, created); forcing "start" contradicts the meaning sets and the user's own refinement discussion.
- _Spans only via popover fields (no gesture)_: viable but loses the direct-manipulation feel for durations; kept as the fallback for Explorer drops only.

## R10. Explorer → timeline external drag-and-drop (US6)

**Decision**: Reuse the Explorer's existing HTML5 drag source — `EntityExplorer.svelte` already calls `dataTransfer.setData("application/codex-entity", entityId)` with `effectAllowed = "copyMove"`. Add a `dragover`/`drop` handler on the graph canvas (`GraphView.svelte`) that, **only in `chronologyEditMode`**, reads that entity id, converts the drop's `clientX/Y` to a Cytoscape model position (`cy.pan()`/`cy.zoom()` inverse), resolves it to a year via `getYearForPosition` (R1), and routes into the same `ChronologyEditService` placement flow used by in-graph drops. The transient drag state gains a `source: 'canvas' | 'explorer'` discriminator; for `'explorer'` there is no origin node to restore on cancel.

**Rationale**: The drag source already exists and is used elsewhere (e.g. dropping onto the graph/map), so this is additive and consistent (Simplicity). Gating on edit mode and reusing the placement flow keeps canon-safety identical to in-graph drags (FR-009c). This is the only entry path for placing entities that are absent from Timeline Mode because they have no date yet (FR-009b).

**Alternatives considered**:

- _A dedicated "add to timeline" button in the detail panel_: rejected as the primary path — it doesn't deliver the direct-manipulation value the issue asks for (though it remains a reasonable secondary affordance, out of scope here).
- _A new drag MIME type_: rejected — reusing `application/codex-entity` keeps one cross-surface contract.

## R12. Create a linked event from a placement (US7)

**Decision**: Add an explicit **"create a linked event"** option to the confirmation popover. On save the `ChronologyEditService` calls the existing `vault.createEntity("event", title, { date })` to make a new Event dated at the resolved year, then `upsertAnchor` on the dragged entity with `linkedEntityId` = the new event id, then adds a `Connection` (`{ target: eventId, type: "related_to" }`) on the dragged entity — all via `vault.updateEntity`/`vault.createEntity`. The title field is pre-filled (`"{Entity} — {year}"`) and editable. It is offered for any dragged entity and is purely additive (never moves the existing placement).

**Rationale**: Realises the `linkedEntityId` already in the anchor schema and the issue's `majorAppearance → event-id` example. Reusing `vault.createEntity` (which runs `applyAutoLabels` and id-uniquing) and the standard connection model keeps it consistent and avoids a bespoke creation path (Simplicity/Privacy). Making it explicit and additive preserves canon safety (FR-035/FR-038) — creating an entity is the most consequential action and must never be a silent drag side effect.

**Atomicity**: Sequence is create-event → add-anchor → add-connection. On any step failure, surface an error and roll back already-applied steps (delete the just-created event / revert the anchor) so no orphaned event, dangling anchor, or stray connection remains (FR-039). The vault's mutation methods are async; the service awaits each and guards with try/catch.

**Alternatives considered**:

- _Auto-create an event whenever an already-placed entity is dragged_: rejected — surprising, litters the vault, violates the no-silent-mutation spirit.
- _Link only via a connection (no anchor)_ or _only an anchor (no connection)_: rejected — the anchor gives the temporal link (so the event shows at that point relative to the entity) and the connection gives the relational link (so it appears in the graph/explorer); both are wanted.

## R9. Deferred (explicitly out of scope this iteration)

- **Undo** of committed changes (clarified: deferred). Cancel-before-save is the safety net.
- **Touch & keyboard-accessible** drag alternatives — desirable; design deferred to a follow-up (pointer-first this iteration, per Assumptions).
- **Bulk/multi-select** temporal edits (spec Out of Scope).
- **New calendar/era configuration** beyond what `026` provides.
