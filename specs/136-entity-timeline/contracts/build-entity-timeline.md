# Contract: Entity Timeline

Two contracts: the **engine function** (pure, library) and the **UI tab** (thin web layer).

## 1. Engine function — `buildEntityTimeline`

Location: `packages/chronology-engine/src/entity-timeline.ts`

```ts
import type { Entity } from "schema";
import type { WorldCalendar } from "./types";
import type { EntityTimeline } from "./types";

export function buildEntityTimeline(
  subject: Entity,
  allEntities: Entity[], // candidate pool (vault.allEntities)
  config: WorldCalendar,
  options?: {
    maxParticipants?: number; // cap on participantTitles per row (default e.g. 5)
    summaryMaxLength?: number; // snippet length (default e.g. 160)
  },
): EntityTimeline;
```

### Behavioral guarantees

| ID   | Guarantee                                                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | Returns only events (`type === "event"`) directly linked to `subject` — outgoing (`subject.connections[].target`) **or** incoming (`event.connections[].target === subject.id`). |
| C-02 | One hop only — never traverses links of linked events.                                                                                                                           |
| C-03 | Each linked event appears exactly once (de-duped by id), even if linked in both directions.                                                                                      |
| C-04 | Dated rows are ordered ascending by `getTimelineValue` (earliest → latest); ties broken by case-insensitive title.                                                               |
| C-05 | Events with no calendar-valid date land in a single trailing `undated` group; their `sortKey` is `undefined`. No date is invented.                                               |
| C-06 | `isEmpty === true` ⇔ zero linked events; in that case `groups` is empty.                                                                                                         |
| C-07 | `subject` is never listed in any row's `participantTitles`.                                                                                                                      |
| C-08 | Pure: does not mutate `subject`, `allEntities`, any element, or `config`; returns fresh objects.                                                                                 |
| C-09 | Date display strings come from `CalendarEngine.format`; range rows include both endpoints.                                                                                       |

### Representative test cases (TDD — write first)

1. Subject with 3 dated linked events (mixed exact/approximate) → single `dated` group, earliest→latest.
2. Subject with dated + undated linked events → `dated` group then `undated` group; undated retain "Undated" label.
3. Event linked via incoming connection only → still included (C-01).
4. Event linked both directions → appears once (C-03).
5. Event with `start_date` + `end_date` → `isRange === true`, sorts by `start_date` (C-09, R3).
6. No linked events → `isEmpty === true`, `groups === []` (C-06).
7. Subject appears in an event's participants → excluded from `participantTitles` (C-07).
8. Non-event linked entity (e.g. a linked character) → **not** included (C-01 type filter).
9. Snapshot of inputs unchanged after call (C-08).

## 2. UI contract — `DetailTimelineTab.svelte`

Location: `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte`

### Props

```ts
{
  entity: Entity; // the subject whose timeline is shown
}
```

(Calendar config + vault entities are pulled from stores via a DI-friendly view-model; tests inject mocks per Principle VIII.)

### Behavior

| ID   | Behavior                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-01 | Registered as tab `"timeline"` in `entityDetailTabs`; shows for entity types that can link to events (factions, characters, locations, items at minimum).      |
| U-02 | Renders dated rows in order, then the "Undated" group when present, each row showing title + date/range; type, summary, and participants shown when available. |
| U-03 | Clicking a row navigates to that event's entity detail page (existing entity navigation).                                                                      |
| U-04 | When `isEmpty`, renders the empty state: "No linked events yet. Add or link events to build this entity's history."                                            |
| U-05 | Read-only: emits no mutation; opening/closing the tab leaves vault state unchanged.                                                                            |
| U-06 | Keyboard-accessible: tab participates in the existing `role="tablist"` arrow-key navigation; rows are reachable and activatable via keyboard.                  |
| U-07 | Uses Tailwind theme tokens (no hard-coded colors); event category rendered as a Label, never "Tag".                                                            |

### Representative component tests

- Empty state renders when no linked events.
- Dated + undated groups render with correct headings/order.
- Clicking a row triggers navigation to the event id (spy/mock).
- No mutation API is invoked (vault snapshot equality).
