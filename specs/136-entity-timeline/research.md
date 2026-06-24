# Phase 0 Research: Entity Timeline (MVP)

All findings are grounded in the existing codebase. No external tech evaluation was required — this feature reuses established packages per Principle III (Simplicity & YAGNI).

## R1 — How are events linked to an entity?

**Decision**: Resolve **direct (one-hop) links bidirectionally** from `Entity.connections`.

- Events are entities with `type === "event"` (see `packages/schema/src/entity.ts` `EntityTypeSchema` + `apps/web/src/lib/config` category `{ id: "event", label: "Event", icon: "lucide:calendar" }`).
- Links are stored as outgoing `connections: Connection[]` on each entity, where `Connection.target` is the other entity's id (`packages/schema/src/connection.ts`). Connections are directional.
- Therefore, for entity X the linked events are the union of:
  1. **Outgoing**: events `e` where `X.connections` contains `{ target: e.id }` and `e.type === "event"`.
  2. **Incoming**: events `e` where `e.connections` contains `{ target: X.id }`.

**Rationale**: A connection may be authored in either direction (e.g. a character `part_of` an event, or an event `related_to` a character). Considering only one direction would silently drop linked events and fail FR-002 / SC-002. Clarification Q1 bounded this to **one hop only** — no transitive/multi-hop traversal.

**Alternatives considered**:

- _Outgoing-only from the entity_: simpler, but misses events that point at the entity. Rejected — incomplete.
- _Graph-engine neighbor query_: `graph-engine` exposes neighborhood helpers, but pulling a graph dependency into a read-only list is heavier than a single pass over `vault.allEntities`. Rejected for MVP (YAGNI).

**Implementation note**: One O(N) pass over `vault.allEntities` building (a) the entity's own outgoing event targets and (b) reverse hits where an event targets the entity. De-duplicate by event id.

## R2 — Date handling, sorting, and display

**Decision**: Reuse `CalendarEngine` and mirror the existing `toCalendarEntry()` pattern.

- Sort key: `calendarEngine.getTimelineValue(date, config)` when `calendarEngine.isValid(date, config)`, else treat as undated.
- Display label: `calendarEngine.format(date, config)`; fall back to `date.label` / "Approximate date" (same as `buildDisplayDateLabel` in `apps/web/src/lib/stores/timeline.svelte.ts`).
- Date kind: `exact` / `approximate` / `missing`, matching `CalendarEventEntry["dateKind"]`.

**Rationale**: The chronology engine already encapsulates calendar math (custom calendars, eras, partial precision). Reimplementing would violate Principle III and risk divergence from the Calendar/Agenda view shipped in #132.

**Alternatives considered**: Custom comparator in the web layer — rejected; duplicates engine logic and is harder to unit-test in isolation.

## R3 — Date ranges and which date drives sorting

**Decision**: Sort an event by `start_date ?? date ?? end_date`. Display a range when both `start_date` and `end_date` exist, using `getTemporalLabel(type, …)` conventions already in `detail-tabs.ts`.

**Rationale**: Events use `date`, `start_date`, `end_date` (`TemporalMetadataSchema.optional()` on `EntitySchema`). The detail header already renders ranges via `getTemporalLabel`; reusing it keeps labels consistent ("Founded"/"Dissolved", etc.). Sorting by start places an event at the moment it began, which matches a founding→decline reading (Clarification Q3).

## R4 — Undated grouping

**Decision**: Events with no valid date go into a single trailing group labelled "Undated"; no sort key is invented (FR-009). Within Undated, order is a stable secondary sort by title.

**Rationale**: `buildDisplayDateLabel` already yields "Undated" for missing dates. Grouping (vs. interleaving) makes the boundary obvious (FR-008, SC-003). Stable title sort prevents reload flicker (edge case in spec).

## R5 — Where the tab plugs in

**Decision**: Extend the existing tab system rather than build a bespoke panel.

- Tab registry: `apps/web/src/lib/components/entity-detail/detail-tabs.ts` — append `"timeline"` to `entityDetailTabs`.
- Tab buttons + a11y (`role="tab"`, arrow-key nav via `getNextEntityDetailTabInList`): `DetailTabs.svelte`.
- Panel switch (`#if activeTab === "…"`): `EntityDetailPanel.svelte` renders the new `DetailTimelineTab.svelte`.

**Open follow-up (low risk)**: `ZenView.svelte` also renders entity tabs. If it consumes the same registry, the Timeline tab appears there automatically; if it hard-codes tabs, Zen support is a fast-follow, not MVP-blocking.

**Rationale**: Matches the project's established pattern (Status/Lore/Map/Chats) and inherits keyboard accessibility for free.

## R6 — Navigation to the event detail page

**Decision**: Clicking a row navigates to the event entity's own detail page using the same entity-navigation mechanism the app already uses for related entities (e.g. `RelatedEntityModal` resolves `vault.entities[conn.target]`; route `vault/[id]/entity/[entityId]`).

**Rationale**: Events are entities, so "open the event" is just "open that entity" — no new routing. Honors entity-navigation-history (#134).

## R7 — Read-only guarantee (FR-010 / SC-005)

**Decision**: `buildEntityTimeline` is a pure function returning new view objects; the tab performs only reads and navigation. No vault mutation APIs are imported into the timeline code path.

**Rationale**: Enforces the non-mutation acceptance criterion structurally (nothing to call that writes), making SC-005 verifiable by inspection + a test asserting vault snapshot equality before/after open.

## Resolved unknowns

All Technical Context items are resolved; no remaining NEEDS CLARIFICATION.
