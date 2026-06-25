# Quickstart: Entity Timeline (MVP)

## Prerequisites

- Repo bootstrapped (`bun install`).
- On branch `136-entity-timeline`.

## Where things live

| Layer                | Path                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Pure logic (library) | `packages/chronology-engine/src/entity-timeline.ts`                  |
| Library types        | `packages/chronology-engine/src/types.ts`                            |
| Tab component        | `apps/web/src/lib/components/entity-detail/DetailTimelineTab.svelte` |
| Tab registry         | `apps/web/src/lib/components/entity-detail/detail-tabs.ts`           |
| Tab buttons          | `apps/web/src/lib/components/entity-detail/DetailTabs.svelte`        |
| Panel switch         | `apps/web/src/lib/components/EntityDetailPanel.svelte`               |
| Help entry           | `apps/web/src/lib/config/help-content.ts`                            |

## Build order (TDD)

1. **Engine first** — add types, write `entity-timeline.test.ts` (cases C-01…C-09 from the contract), then implement `buildEntityTimeline`. `export *` from `index.ts`.
2. **Wire the tab** — add `"timeline"` to `entityDetailTabs`, render its button in `DetailTabs.svelte`, branch on it in `EntityDetailPanel.svelte`.
3. **Tab component** — `DetailTimelineTab.svelte`: call the view-model, render groups/rows, empty state, click-to-navigate. Add `DetailTimelineTab.test.ts`.
4. **Help + hint** — add a `"timeline"` help entry (Principle VII).
5. **E2E** — `apps/web/tests/entity-timeline.spec.ts`: open an entity with linked events, see ordered timeline, click an event, land on its page.

## Run & verify

```bash
# Unit + component tests
bun run test

# Lint (constitution VI)
bun run lint

# Dev server for manual check
bun run dev   # then open an entity detail panel → Timeline tab
```

## Manual acceptance walkthrough (maps to spec SC-xxx)

1. Open an entity (e.g. a faction) that has several linked events with dates → **Timeline** tab is one click away (SC-001).
2. Confirm events are listed earliest → latest with readable titles + dates (SC-002).
3. Link an undated event → it appears under a clearly-labelled **Undated** group at the end, with no invented date (SC-003).
4. Click any event → its detail page opens (SC-004).
5. Re-open the tab repeatedly → underlying lore unchanged (SC-005 — read-only).
6. Open an entity with no linked events → empty state with the suggested copy (SC-006).
7. Repeat for a character, a location, and an item that link to events (SC-007).
