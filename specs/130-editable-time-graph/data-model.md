# Phase 1 Data Model: Editable Time Graph

Source: spec FR-020..FR-025, Key Entities, and Clarifications (hybrid storage). All new types live in `packages/schema`; resolution/derivation logic lives in `chronology-engine`.

## 1. TemporalAnchor (NEW — `packages/schema/src/entity.ts`)

A structured record of **one additional chronological meaning** for an entity.

| Field            | Type               | Required | Notes                                                                                                                                                                                      |
| ---------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | `string` (min 1)   | yes      | Stable per-anchor id, unique within the entity (e.g. `anchor-major-621`).                                                                                                                  |
| `type`           | `string` (min 1)   | yes      | Semantic meaning id from the meaning catalogue (`born`, `died`, `founded`, `dissolved`, `majorAppearance`, `schism`, `merger`, `created`, `discovered`, `lost`, `recovered`, `custom`, …). |
| `label`          | `string`           | no       | User-facing override, required when `type === "custom"`.                                                                                                                                   |
| `date`           | `TemporalMetadata` | no       | Point-in-time anchor. Mutually exclusive in practice with `start_date`/`end_date`.                                                                                                         |
| `start_date`     | `TemporalMetadata` | no       | Span start.                                                                                                                                                                                |
| `end_date`       | `TemporalMetadata` | no       | Span end. Must be ≥ `start_date` (see `validateRange`).                                                                                                                                    |
| `linkedEntityId` | `string`           | no       | Soft reference to another entity (e.g. event of a major appearance). Dangling = render broken link (FR-033).                                                                               |
| `note`           | `string`           | no       | Free-text annotation.                                                                                                                                                                      |

**Validation rules**:

- Exactly one of {`date`} or {`start_date` and/or `end_date`} should be meaningful; an anchor with neither is invalid (must carry at least one date).
- `type === "custom"` ⇒ `label` required (non-empty).
- If both `start_date` and `end_date` present ⇒ `end_date.year >= start_date.year` (and month/day tiebreak) — enforced by `validateRange` (FR-031).
- `date`/`start_date`/`end_date` reuse the existing `TemporalMetadataSchema` (year-precision minimum); no free-form strings (R5).

**Zod sketch**:

```ts
export const TemporalAnchorSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    label: z.string().optional(),
    date: TemporalMetadataSchema.optional(),
    start_date: TemporalMetadataSchema.optional(),
    end_date: TemporalMetadataSchema.optional(),
    linkedEntityId: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine(/* at least one date; custom ⇒ label; range non-inverted */);
export type TemporalAnchor = z.infer<typeof TemporalAnchorSchema>;
```

## 2. Entity (MODIFIED — `packages/schema/src/entity.ts`)

Add one optional field; **do not** touch the existing temporal fields.

| Field             | Type                | Change    | Notes                                                                                                                                             |
| ----------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date`            | `TemporalMetadata?` | unchanged | **Authoritative** for the primary point (FR-020a).                                                                                                |
| `start_date`      | `TemporalMetadata?` | unchanged | Authoritative for primary span start.                                                                                                             |
| `end_date`        | `TemporalMetadata?` | unchanged | Authoritative for primary span end.                                                                                                               |
| `temporalAnchors` | `TemporalAnchor[]?` | **NEW**   | Additional meanings only (FR-020b). Absent/empty when the entity has only a primary value. Default: omitted (not `[]`) to keep frontmatter clean. |

Back-compat: the field is optional; all existing vaults parse unchanged (SC-005). Existing readers (`timeline.svelte.ts`, `getTimelineLayout`) keep working on the flat fields.

## 3. Derived: ProjectedAnchor (NEW — `chronology-engine` / `graph-engine`)

A non-persisted view used for rendering and drag (R2). One per displayable anchor of an entity.

| Field         | Type                                               | Notes                                                             |
| ------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `entityId`    | `string`                                           | Host entity.                                                      |
| `anchorId`    | `string`                                           | `"primary"` for the legacy-field value, else `TemporalAnchor.id`. |
| `source`      | `'date' \| 'start_date' \| 'end_date' \| 'anchor'` | Where it came from (drives the save target).                      |
| `kind`        | `'point' \| 'span'`                                | Determines node vs span rendering (FR-026/FR-027).                |
| `year`        | `number`                                           | Resolved positioning year (point) or span start.                  |
| `endYear`     | `number?`                                          | For spans.                                                        |
| `meaningType` | `string`                                           | For label/popover context.                                        |
| `linkBroken`  | `boolean?`                                         | True if `linkedEntityId` missing (FR-033).                        |

`deriveProjectedAnchors(entity): ProjectedAnchor[]` = the primary value (from `date`/`start_date`+`end_date`) as `anchorId: "primary"` **plus** one per `temporalAnchors[]` entry. This is the single source for both the renderer and FR-028.

## 4. Meaning catalogue (NEW — `chronology-engine/src/meaning-sets.ts`)

`Meaning = { id, label, kind: 'point'|'span', target: 'date'|'start_date'|'end_date'|'anchor', anchorType?, primary?: boolean, role?: 'begin'|'end' }`

The `role` field encodes FR-016a: per type, exactly one meaning is `role: 'begin'` (the category-correct "when it started" word — `date`/`born`/`founded`/`created`/`associatedDate`) and at most one is `role: 'end'` (`end_date`/`died`/`dissolved`/`destroyed`/`lost`). A point drop defaults to the `begin` meaning; a span gesture defaults to the `begin`+`end` pair. The `begin` meaning is also the `primary: true` meaning that writes the legacy `date` (or `start_date` for span-primary types). Helper: `getBeginMeaning(type)` / `getEndMeaning(type)`.

`MEANING_SETS: Record<string, Meaning[]>` keyed by category id (R4). Minimum coverage (FR-016):

| Type                                            | Meanings (id → target)                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event`                                         | date→`date` (primary, point); start→`start_date`; end→`end_date` (span via start+end)                                                                                       |
| `character`                                     | born→`date`/anchor `born` (primary point); died→anchor `died`; active→anchor `active` (span); reign→anchor `reign` (span); majorAppearance→anchor `majorAppearance` (point) |
| `faction`                                       | founded→`date`/anchor `founded` (primary); dissolved→anchor `dissolved`; active→anchor `active` (span); schism→anchor `schism`; merger→anchor `merger`                      |
| `location`                                      | founded→`date` (primary); destroyed→anchor `destroyed`; occupied→anchor `occupied` (span); goldenAge→anchor `goldenAge` (span); relevant→anchor `relevant` (span)           |
| `item`                                          | created→`date` (primary); discovered→anchor `discovered`; lost→anchor `lost`; ownership→anchor `ownership` (span); recovered→anchor `recovered`                             |
| `note`                                          | associatedDate→`date` (primary); associatedPeriod→anchor `associatedPeriod` (span); custom→anchor `custom`                                                                  |
| _(fallback — `creature` + any custom category)_ | date→`date` (primary begin, point); range→`start_date`+`end_date` (span); custom→anchor                                                                                     |

There is **no `period` type** — date ranges are expressed via `start_date`/`end_date` on any type (US3), not a dedicated category. Every set implicitly includes the universal **`custom`** meaning (FR-017). The `primary` meaning is the one that writes the legacy `date` (or `start_date`/`end_date` for span-primary types) instead of an anchor entry — encoding the hybrid decision.

## 5. Transient: ChronologyDrag (NEW — `apps/web` store, non-persisted)

Exists only between `grab` and save/cancel (spec "Placement interaction").

| Field            | Type                            | Notes                                                                                                                                                                                                     |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | `'canvas' \| 'explorer'`        | `'canvas'` = in-graph anchor drag (US1–US4); `'explorer'` = external drag from the Entity Explorer (US6).                                                                                                 |
| `entityId`       | `string`                        | Dragged entity.                                                                                                                                                                                           |
| `anchorId`       | `string`                        | Grabbed projected anchor (`"primary"` or an anchor id). For `'explorer'` placements the target anchor is chosen at confirm time.                                                                          |
| `originPosition` | `{x,y} \| null`                 | For restore-on-cancel (FR-006). `null` for `'explorer'` (no pre-existing node to restore).                                                                                                                |
| `originalValue`  | `TemporalMetadata \| undefined` | Captured at drag-start for conflict detection (FR-032).                                                                                                                                                   |
| `pressYear`      | `number \| null`                | Year at gesture start (in-canvas press). Equals `targetYear` until a width is swept.                                                                                                                      |
| `targetYear`     | `number \| null`                | Live-resolved current year (R1); `null` ⇒ invalid drop (FR-012).                                                                                                                                          |
| `gestureKind`    | `'point' \| 'span'`             | Derived live: `'span'` once the swept width resolves to a difference of **≥ 1 year** (and ≥ ~6px to avoid jitter), else `'point'` (FR-011a). For `source: 'explorer'` always `'point'` at drop (FR-011b). |
| `pending`        | `PlacementIntent \| null`       | Resolved on drop, awaiting confirm. For a span gesture, carries both `value` (from `pressYear`) and `endValue` (from `targetYear`).                                                                       |

## 6. Mode state (MODIFIED — `apps/web/src/lib/stores/graph.svelte.ts`)

| Field                | Type      | Notes                                                                                                                                 |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `timelineMode`       | `boolean` | existing — view positioning.                                                                                                          |
| `chronologyEditMode` | `boolean` | **NEW** — gates temporal mutation (FR-001/FR-003). Requires `timelineMode`. Toggling off clears any pending drag (treated as cancel). |

## 7. State transitions (drag lifecycle)

```
view (chronologyEditMode=false)
  └─ toggle edit ─▶ edit-idle
edit-idle
  └─ grab anchor point ─▶ dragging (capture origin + originalValue)
dragging
  ├─ move ─▶ dragging (update targetYear via getYearForPosition)
  ├─ drop on valid year ─▶ confirming (build PlacementIntent)
  └─ drop on invalid / Escape ─▶ edit-idle (restore origin, no write)
confirming
  ├─ save (valid range, no conflict) ─▶ vault.updateEntity ─▶ edit-idle
  ├─ range invalid ─▶ confirming (blocked, show reason — FR-031)
  ├─ conflict detected ─▶ confirming (surface conflict — FR-032)
  └─ cancel / Escape / exit edit mode ─▶ edit-idle (restore origin, no write)
```

## 7a. Linked-event creation (US7)

A placement may, instead of (or in addition to) writing the dragged entity's own date/anchor, **create a new Event entity** linked back to it. This produces three coordinated writes via the existing vault APIs:

1. `vault.createEntity("event", title, { date: <resolved> })` → new Event (auto-Labels, unique id).
2. `upsertAnchor` on the dragged entity → a `TemporalAnchor` (e.g. `type: "majorAppearance"`) with `linkedEntityId` = new event id.
3. A `Connection` (`{ target: eventId, type: "related_to" }`) added to the dragged entity's `connections[]`.

It is additive (never touches the source's primary date/existing anchors) and transactional (rollback on partial failure). The transient drag's `pending` `PlacementIntent` carries an optional `createEvent` payload (see contract) when this option is chosen.

## 8. Relationships & integrity

- An entity owns 0..N `temporalAnchors`; deleting/editing one never affects siblings or the primary fields (FR-023/FR-024).
- `temporalAnchors[*].linkedEntityId` → soft FK to another entity; dangling tolerated (FR-033).
- Primary fields ↔ `ProjectedAnchor("primary")` is a pure derivation, never duplicated into `temporalAnchors` (FR-025).
- Status Labels (e.g. `past`) remain derived by `applyAutoLabels` on save (Constitution XII), not stored on anchors.
