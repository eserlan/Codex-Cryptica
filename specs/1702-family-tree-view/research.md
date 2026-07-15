# Phase 0 Research: Family Tree View

All spec-level unknowns were resolved during `/speckit-clarify` (see spec `## Clarifications`). This document records the technical decisions grounded in the existing codebase.

## Decision 1: Family links as first-class connection types

- **Decision**: Extend `ConnectionTypeSchema` (packages/schema/src/connection.ts) with `parent_of`, `child_of`, and `spouse_of`. `parent_of` and `child_of` are inverses; `spouse_of` is its own inverse (symmetric).
- **Rationale**: Spec Clarification chose dedicated types over free-text labels so the tree derives unambiguously. The schema already allows `type` to be an enum member or a custom string, so adding enum members is additive and backward-compatible; existing generic connections are unaffected.
- **Alternatives considered**:
  - Reserved labels on generic connections — rejected (fuzzy, typo-prone, chosen against in clarification).
  - Separate `kind` field on `Connection` — rejected (larger schema/migration surface; the existing `type` field already models relationship kind).

## Decision 2: Reciprocity written to both entities

- **Decision**: Add `addFamilyLink` / `removeFamilyLink` mutations in `apps/web/src/lib/stores/vault/family-mutations.ts` that call the existing `addConnection`/`removeConnection` primitives **twice** — once per direction — using the engine's `inverseFamilyType`. Generic `addConnection` stays single-sided (unchanged).
- **Rationale**: Today `entities.ts:addConnection` writes only the source's `connections[]` (verified — no reciprocity exists). The clarification requires both sides written so data is consistent from either entity. Keeping this in a dedicated family mutation avoids changing generic connection semantics (Constitution III — surgical).
- **Alternatives considered**:
  - Make generic `addConnection` always write inverses — rejected (changes behavior for all connection types; risky, out of scope).
  - Derive the inverse at read time — rejected by clarification (leaves stored data one-sided).

## Decision 3: Family Tree surface = entity-detail tab

- **Decision**: Add `"family"` to `entityDetailTabs` (detail-tabs.ts) and render a `DetailFamilyTab.svelte` panel, following the existing `DetailStatusTab`/`DetailTimelineTab` pattern (roving-tabindex, panel IDs via `createEntityDetailTabIds`).
- **Rationale**: Clarification chose a tab/panel in the character's detail view. The tab infrastructure (keyboard nav, ARIA panel wiring) already exists and is tested, so this is the lowest-risk, most consistent surface.
- **Alternatives considered**: Dedicated top-level mode (heavier, rejected in clarification); modal (cramped for multi-generation trees, rejected).

## Decision 4: Layout approach — deterministic hierarchical, no physics engine

- **Decision**: Compute generations by BFS/DFS from the focus character (parents = −1, children = +1), place partners adjacent, group siblings by shared parents, and render with CSS grid/flex columns per generation. No cytoscape/force layout.
- **Rationale**: Family trees are hierarchical and deterministic; a physics engine (used by graph mode) is unnecessary complexity (Constitution III / YAGNI) and harder to make legible + mobile-safe. Deterministic layout also makes collapsing/re-centre and tests straightforward.
- **Alternatives considered**: Reuse `graph-engine`/cytoscape — rejected (overkill, non-deterministic positions, mobile overflow risk). A third-party tree-layout lib — deferred unless deterministic CSS layout proves insufficient.

## Decision 5: Sibling inference & cycle detection in the engine

- **Decision**: `@codex/family-engine` exposes pure functions: `buildFamilyTree(focusId, entities)` (ancestors/descendants/partners + siblings inferred from shared `parent_of` parents) and `wouldCreateCycle(entities, childId, proposedParentId)` (walks ancestry to detect if the proposed parent is a descendant of the child).
- **Rationale**: Constitution I (Library-First) — genealogy logic is a distinct domain, pure and highly testable, so it belongs in a package, not the UI. Cycle detection backs FR-013's hard-prevent.
- **Alternatives considered**: Inline logic in the Svelte component — rejected (untestable in isolation, violates Library-First).

## Decision 6: Lifespan / living-deceased derivation

- **Decision**: Reuse existing temporal metadata and the `getTemporalLabel` helper (Born/Died) for lifespan display; treat a character with no recorded end/death date as living. Deceased status derives from the end-date **Label** already used elsewhere (Constitution XII).
- **Rationale**: DRY (Constitution III) and terminology unification (XII) — no new status concept; the app already models Born/Died and end-date labels.
- **Alternatives considered**: New per-entity `status` field — rejected (duplicates existing temporal/label data).

## Decision 7: "Connect existing" reuses entity search

- **Decision**: Empty-slot "connect existing character" reuses the existing entity autocomplete/search used by `RelatedEntityModal`/`ConnectionCreator`, filtered to the `character` category. "Create new" uses the standard new-entity creation flow, then links via `addFamilyLink`.
- **Rationale**: DRY; these flows are built and tested. Filtering to characters satisfies FR-014.
- **Alternatives considered**: A bespoke picker — rejected (duplication).

## Open items deferred to implementation (non-blocking)

- Exact propagation of the two-sided writes through sync/P2P (both writes go through the normal entity-update path, so they replicate like any other entity mutation — confirm no special-casing needed during implementation).
- Delete-cascade: when a linked character is deleted, ensure dangling inverse links are cleaned or tolerated by the tree renderer (renderer already treats missing targets as empty).
