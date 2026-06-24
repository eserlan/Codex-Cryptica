# Phase 1 Data Model: Entity Timeline (MVP)

This feature introduces **no persisted schema changes**. It reads existing `Entity` data and produces transient view models. New types live in `packages/chronology-engine/src/types.ts`.

## Existing inputs (read-only)

### Entity (`packages/schema/src/entity.ts`)

Relevant fields consumed:

| Field         | Type                | Use                                                               |
| ------------- | ------------------- | ----------------------------------------------------------------- |
| `id`          | `string`            | Identity, navigation target                                       |
| `type`        | `EntityType`        | `"event"` identifies timeline items; subject's type drives labels |
| `title`       | `string`            | Row title                                                         |
| `content`     | `string`            | Source for the short summary/snippet                              |
| `labels`      | `string[]`          | Event type/category surfaced as Labels (Principle XII)            |
| `connections` | `Connection[]`      | Link resolution (outgoing)                                        |
| `date`        | `TemporalMetadata?` | Single-point date                                                 |
| `start_date`  | `TemporalMetadata?` | Range start / primary sort date                                   |
| `end_date`    | `TemporalMetadata?` | Range end                                                         |

### Connection (`packages/schema/src/connection.ts`)

| Field    | Type      | Use                                                        |
| -------- | --------- | ---------------------------------------------------------- |
| `target` | `string`  | The linked entity id (direction: source → target)          |
| `type`   | `string`  | Not filtered in MVP (any connection type counts as a link) |
| `label`  | `string?` | Optional relationship label (not required for MVP display) |

## New view-model types (transient, not persisted)

### `EntityTimelineRow`

One linked event, prepared for display.

| Field               | Type                                    | Notes                                                                                                                                                                                                                               |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventId`           | `string`                                | Navigation target (the event entity id)                                                                                                                                                                                             |
| `title`             | `string`                                | Event title                                                                                                                                                                                                                         |
| `dateKind`          | `"exact" \| "approximate" \| "missing"` | Reused from `CalendarEventEntry["dateKind"]`                                                                                                                                                                                        |
| `displayDateLabel`  | `string`                                | e.g. "12 March 1023", a range, or "Undated"                                                                                                                                                                                         |
| `isRange`           | `boolean`                               | True when both `start_date` and `end_date` are present                                                                                                                                                                              |
| `sortKey`           | `number \| undefined`                   | `getTimelineValue(primaryDate)`; `undefined` ⇒ undated                                                                                                                                                                              |
| `eventCategory`     | `string \| undefined`                   | Human-facing event category **derived from the event's `labels`** (e.g. "Battle", "Founding"), never the entity-type value `"event"`. Rendered as a Label (Principle XII), not a Tag. Omitted when the event has no category Label. |
| `summary`           | `string \| undefined`                   | Trimmed snippet from `content`, if available                                                                                                                                                                                        |
| `participantTitles` | `string[]`                              | Related participant titles, excluding the subject entity; capped/cheap                                                                                                                                                              |

### `EntityTimelineGroup`

| Field   | Type                   | Notes                        |
| ------- | ---------------------- | ---------------------------- |
| `kind`  | `"dated" \| "undated"` | Drives section heading       |
| `label` | `string`               | e.g. "Timeline" or "Undated" |
| `rows`  | `EntityTimelineRow[]`  | Ordered rows                 |

### `EntityTimeline` (function output)

| Field     | Type                    | Notes                                                                      |
| --------- | ----------------------- | -------------------------------------------------------------------------- |
| `groups`  | `EntityTimelineGroup[]` | `dated` group first (earliest → latest), then `undated` (if any)           |
| `isEmpty` | `boolean`               | True when the subject has zero linked events ⇒ render empty state (FR-011) |

## Ordering rules

1. **Dated rows**: ascending by `sortKey` (earliest → latest, Clarification Q3).
2. **Tie-break**: stable, case-insensitive `title.localeCompare` (prevents reload flicker).
3. **Undated rows**: trailing group, ordered by tie-break only (no fabricated `sortKey`, FR-009).

## Validation / invariants

- A row is **never** synthesized for an event with no valid date _and_ no presence in the linked set — only real linked events appear (FR-002).
- The subject entity is excluded from its own `participantTitles` (spec edge case: no self-reference noise).
- An event linked through both an outgoing and an incoming connection appears **once** (de-dupe by `eventId`).
- No field write occurs anywhere in this path (FR-010); output objects are freshly constructed.

## State transitions

None. The timeline is a pure projection of current vault state; it recomputes via `$derived` when the vault or the active entity changes (FR-013).
