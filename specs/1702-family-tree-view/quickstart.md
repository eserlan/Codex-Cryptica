# Quickstart: Family Tree View

How the pieces fit together and how to validate the feature end-to-end.

## Build order (follows tasks.md once generated)

1. **Schema** — add `parent_of`, `child_of`, `spouse_of` to `ConnectionTypeSchema` (packages/schema). Unit test the enum accepts them.
2. **`@codex/family-engine` package** — scaffold like `graph-engine` (package.json, tsconfig, vitest.config). Implement + test, TDD:
   - `family-types.ts`: `FAMILY_CONNECTION_TYPES`, `isFamilyType`, `inverseFamilyType`.
   - `cycle-detection.ts`: `wouldCreateCycle`.
   - `family-tree.ts`: `buildFamilyTree` (parents/children/partners + inferred siblings, lifespan/deceased).
   - `index.ts`: export the contract surface.
3. **Family mutations** — `apps/web/src/lib/stores/vault/family-mutations.ts`: `addFamilyLink` / `removeFamilyLink` writing both sides, cycle-guarded, character-only. Expose via `vault.svelte.ts`. Unit test both-sides write, both-sides remove, cycle rejection, non-character rejection.
4. **Detail tab** — add `"family"` to `entityDetailTabs`; render trigger/panel in `DetailTabs.svelte`; create `DetailFamilyTab.svelte`.
5. **Tree UI** — `FamilyTree.svelte` (generation layout, pan, collapse, re-centre), `FamilyMemberCard.svelte`, `EmptyFamilySlot.svelte` (connect-existing via character-filtered entity search; create-new via standard flow).
6. **Docs** — help-content.ts article + FeatureHint (Constitution VII).

## Manual validation (maps to spec Success Criteria)

Prereq: `bun install`, then run the app (`bun run dev`, http://localhost:5173).

1. **P1 / SC-002** — Create three characters. On character B, add A as a **parent** and C as a **child**. Open B's **Family** tab: A appears above, C below, B centred, cards show portrait/name/role/lifespan/status.
2. **Siblings (US1 #3)** — Add a second child D to A. Open C's Family tab: D shows as a **sibling** (never manually linked).
3. **P2 / SC-003** — From an empty **partner** slot on B, create a new character E. Confirm E exists as an entity and opening E shows B as its partner (both sides written). Time it — under 30s.
4. **SC-004 (cycle)** — On A, try to add C (A's grandchild) as A's **parent**. Confirm the save is **blocked** with an explanation.
5. **SC-006 (single source of truth)** — Open the graph/connections view; confirm the family links appear as ordinary entity connections (typed `parent_of`/etc.), i.e. no separate store.
6. **P3 / SC-005 (mobile)** — In a mobile viewport with a 4-generation tree, pan and collapse a branch; confirm no horizontal page overflow and the tree stays interactive.
7. **SC-007 (scale)** — With ≥50 members, confirm select / collapse / re-centre stay responsive.

## Automated validation

- `bun run --filter family-engine test` (engine unit tests, ≥70% coverage per Constitution X).
- `bun run --filter web test` for family mutations + `DetailFamilyTab` component tests.
- `bun run lint` and `bun run lint:types`.

## Key reuse points (avoid reinventing — Constitution III)

- Write primitives: `vault.addConnection` / `vault.removeConnection` (single-sided) — orchestrated twice by family mutations.
- Entity search for "connect existing": the autocomplete used by `RelatedEntityModal` / `ConnectionCreator`, filtered to `character`.
- Lifespan labels: `getTemporalLabel` (Born/Died) in `detail-tabs.ts`.
- Tab scaffolding: `createEntityDetailTabIds`, `getNextEntityDetailTab` in `detail-tabs.ts`.
