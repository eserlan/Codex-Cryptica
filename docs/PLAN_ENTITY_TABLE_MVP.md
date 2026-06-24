# Entity Table / List View — MVP Implementation Plan

**Issue:** #1509 (MVP) under epic #1508
**Scope:** Read-only, spreadsheet-like overview of vault entities — rows = entities, columns = key attributes. Search, type filter, sorting, row → entity navigation. No editing, no bulk actions, no saved views.

## Design decisions (resolved up front)

| Question                | Decision                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Where it lives          | New route `vault/[id]/table` + an `ActivityBar` view entry (peer to Graph/Map/Canvas/Timeline), per the epic framing it as a distinct mode.                                                                                    |
| Data source             | Reuse `vault.allEntities` (already loaded into the store) — no new loading path.                                                                                                                                               |
| "Created date" column   | Schema now carries `createdAt` + `modifiedAt` (set in `entities.ts`/`entity-mutations.ts`). Created shows `createdAt`; Modified shows `modifiedAt ?? updatedAt ?? lastUpdated`. Legacy entities without timestamps render `—`. |
| Mobile                  | Horizontal scroll within a constrained container (keep all columns); no card fallback in MVP. Header stays sticky.                                                                                                             |
| Filtering/sorting logic | Reuse `filterEntities` / `countEntityTypes` from `explorer/entityListFiltering.ts` where possible; add a small sort helper.                                                                                                    |

## Baseline columns (MVP)

Name · Type · Summary snippet · Tags/labels · Created · Updated

Empty values render as `—`. Incomplete entities are never hidden.

## Follow-up — Connection summary

**Reference:** Original Entity Table issue [#1509](https://github.com/eserlan/Codex-Cryptica/issues/1509)

Add one sortable **Connections** column. It shows the total number of valid relationships, followed by compact directional counts (`in · out`) when the total is non-zero. An entity with no relationships renders `0`, not `—`, so users can identify isolated entities.

The table uses the existing `vault.inboundConnections` index and each entity's outgoing `connections`; it does not add graph navigation, filtering, editing, or separate inbound/outbound columns. This preserves the read-only overview scope of #1509 while exposing relationship density.

---

## Phase 1 — Route & navigation scaffold

Goal: a reachable, empty Entity Table page wired into navigation.

- [ ] 1.1 Create route `apps/web/src/routes/(app)/vault/[id]/table/+page.svelte` (mirror the vault-switch `$effect` pattern from `vault/[id]/+page.svelte`).
- [ ] 1.2 Add a `table` view entry to `views` in `ActivityBar.svelte` (icon e.g. `icon-[lucide--table]`, label "Table", href `${base}/table`).
- [ ] 1.3 Add the same entry to `MobileMenu.svelte` for parity.
- [ ] 1.4 Render a placeholder + `EmptyState` when the vault has no entities.

**Done when:** navigating to the route shows a page and the ActivityBar/MobileMenu link works.

## Phase 2 — Table rendering (read-only)

Goal: entities displayed as rows with the baseline columns.

- [ ] 2.1 Create `apps/web/src/lib/components/table/EntityTable.svelte` — semantic `<table>`, sticky header, horizontal scroll container.
- [ ] 2.2 Create `EntityTableRow.svelte` (or inline) rendering the baseline columns; resolve type → category label/color/icon via the `categories` store.
- [ ] 2.3 Summary snippet: derive a short plain-text excerpt from `content`/`lore` (strip markdown, truncate). Put in `lib/components/table/entityTableSnippet.ts`.
- [ ] 2.4 Render empty values as `—`.
- [ ] 2.5 Row click → navigate to `${base}/vault/${vaultId}/entity/${entity.id}` (keyboard accessible: row is a link/button, Enter activates).

**Done when:** all vault entities render with correct columns and clicking a row opens the entity.

## Phase 3 — Search, filter, sort

Goal: the three core controls.

- [ ] 3.1 Global search input — filter by title/aliases (+ content if cheap). Reuse `filterEntities` from `entityListFiltering.ts`.
- [ ] 3.2 Entity-type filter (dropdown or chips) driven by `countEntityTypes`; show counts.
- [ ] 3.3 Sortable columns: Name, Type, Updated (+ Created if present). Click header to toggle asc/desc; small new `sortEntities` helper in `lib/components/table/entityTableSort.ts`.
- [ ] 3.4 Visual sort indicator on the active column header.
- [ ] 3.5 Empty-result state when filters match nothing.

**Done when:** all of issue #1509's acceptance criteria for search/filter/sort pass.

## Phase 4 — Responsive & polish

- [ ] 4.1 Verify horizontal scroll + sticky header on narrow viewports; ensure no layout break.
- [ ] 4.2 Theme tokens consistent with existing explorer/table styling (no hardcoded colors).
- [ ] 4.3 a11y pass: `scope` on headers, `aria-sort`, focus-visible on rows, sensible tab order.
- [ ] 4.4 Loading state while vault initializes (reuse vault `status`/phase pattern).

## Phase 5 — Tests

- [ ] 5.1 `entityTableSort.ts` unit tests (asc/desc, missing values sort last).
- [ ] 5.2 `entityTableSnippet.ts` unit tests (markdown stripped, truncation, empty input → `—`).
- [ ] 5.3 Component test for `EntityTable.svelte`: renders rows, type filter narrows, sort reorders, row link points to the entity route (mirror `vault/[id]/__tests__` stub pattern).
- [ ] 5.4 Route smoke test `table/page.route.test.ts` (mirror existing `page.route.test.ts`).

---

## Acceptance criteria (from #1509)

- [ ] Open the Entity Table view
- [ ] See vault entities as rows
- [ ] Search entities
- [ ] Filter by entity type
- [ ] Sort by at least Name and Updated
- [ ] Click a row to open the entity
- [ ] Empty/missing values shown clearly (`—`)
- [ ] Works on desktop, does not break on smaller screens

## Explicit non-goals (MVP)

No inline editing · no bulk actions · no saved views · no custom columns · no AI cleanup · no CSV export · no relationship-graph behavior.

## Reused existing code

- `vault.allEntities` — `apps/web/src/lib/stores/vault.svelte.ts`
- `filterEntities`, `countEntityTypes` — `apps/web/src/lib/components/explorer/entityListFiltering.ts`
- `categories` store — `apps/web/src/lib/stores/categories.svelte.ts`
- Vault-switch `$effect` + entity route — `vault/[id]/+page.svelte`, `vault/[id]/entity/[entityId]/+page.svelte`
- `EmptyState` — `$lib/components/ui/EmptyState.svelte`

## New files

- `routes/(app)/vault/[id]/table/+page.svelte`
- `lib/components/table/EntityTable.svelte`
- `lib/components/table/EntityTableRow.svelte`
- `lib/components/table/entityTableSnippet.ts`
- `lib/components/table/entityTableSort.ts`
- tests under `lib/components/table/__tests__/` and `routes/(app)/vault/[id]/table/`
