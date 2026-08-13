# Implementation Plan: Family Tree View

**Branch**: `1702-family-tree-view` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/1702-family-tree-view/spec.md`

## Summary

Add a **Family** tab to the character entity-detail view that renders an interactive, auto-laid-out family tree (parents, partner, children, inferred siblings) derived entirely from standard entity connections. Introduce three first-class family connection types (`parent_of`, `child_of`, `spouse_of`) in the schema, and a new `@codex/family-engine` package holding the pure genealogy logic: family-type constants, inverse-type mapping, tree derivation from the entity map, sibling inference, and circular-ancestry (cycle) detection. The web layer adds family-aware mutations that write **both sides** of a family link (and remove both sides), hard-block cycles, and expose "connect existing / create new" from empty slots — reusing the existing entity-search and connection write primitives.

## Technical Context

**Language/Version**: TypeScript 5.x (repo pinned to `typescript@6.0.3` per project notes), Svelte 5 (runes)  
**Primary Dependencies**: SvelteKit, Tailwind CSS 4, Zod (`schema` package), Dexie (entity store), Vitest + @testing-library/svelte  
**Storage**: Client-side entity store (Dexie/OPFS); family links live inside each entity's existing `connections[]` array — no new persisted store  
**Testing**: Vitest unit tests (package + web), @testing-library/svelte for component tests; coverage floors per Constitution X (≥70% for the new engine package)  
**Target Platform**: Web (desktop + mobile browsers), client-side/offline-capable  
**Project Type**: Web monorepo — `packages/*` libraries + thin `apps/web` UI layer  
**Performance Goals**: Tree derivation and re-centre feel instant for typical families; remains interactive at ≥50 members via collapsing/re-centre (SC-007); no full-graph physics engine required  
**Constraints**: No parallel genealogy data store (FR-015); all derivation client-side; mobile must not overflow horizontally (FR-008, SC-005)  
**Scale/Scope**: One new package, one schema enum extension, one new detail tab + tree components, family-aware vault mutations, one help-content entry + FeatureHint

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Gate                                                                                                                                                                                                                                                                              | Status     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| I. Library-First              | Genealogy logic lives in a standalone `packages/@codex/family-engine`; `apps/web` is a thin UI layer over it                                                                                                                                                                      | PASS       |
| II. TDD                       | Engine functions and family mutations get failing unit tests first (derivation, inverse, cycle detection, both-sides write/remove)                                                                                                                                                | PASS       |
| III. Simplicity / YAGNI / DRY | Reuse `vault.addConnection`/`removeConnection`, existing entity-search UI (RelatedEntityModal/ConnectionCreator autocomplete), and `getTemporalLabel` for Born/Died; deterministic hierarchical layout instead of pulling in a graph physics engine; only parent/spouse kinds now | PASS       |
| IV. AI-First Extraction       | No AI in scope (AI actions deferred); no violation                                                                                                                                                                                                                                | PASS (N/A) |
| V. Privacy / Client-Side      | All derivation and mutation happen in-browser over the local entity store                                                                                                                                                                                                         | PASS       |
| VI. Clean Implementation      | Svelte 5 runes, Tailwind 4 tokens, STYLE_GUIDE adherence, typed engine API                                                                                                                                                                                                        | PASS       |
| VII. User Documentation       | Add a `help-content.ts` article for the Family Tree and a first-use `FeatureHint`                                                                                                                                                                                                 | PASS       |
| VIII. Dependency Injection    | Any new web service/store uses constructor DI with singleton export; engine is pure functions (no DI needed)                                                                                                                                                                      | PASS       |
| IX. Natural Language          | User-facing copy: "Family", "Add parent", "Add child", "Partner" — plain terms                                                                                                                                                                                                    | PASS       |
| X. Quality & Coverage         | New `family-engine` package meets ≥70% coverage on introduction; web changes maintain floor                                                                                                                                                                                       | PASS       |
| XII. Labels over Tags         | Living/deceased status derives from end-date **Labels**, not a new "tag" concept                                                                                                                                                                                                  | PASS       |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/1702-family-tree-view/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── family-engine.md # Phase 1 output — public API contract of @codex/family-engine
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
packages/
├── schema/
│   └── src/connection.ts            # EXTEND: add parent_of, child_of, spouse_of to ConnectionTypeSchema
└── family-engine/                   # NEW package (@codex/family-engine)
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    └── src/
        ├── family-types.ts          # FAMILY_CONNECTION_TYPES, isFamilyType, inverseFamilyType
        ├── family-types.test.ts
        ├── family-tree.ts           # buildFamilyTree(focusId, entities): derived tree (parents/partners/children/siblings)
        ├── family-tree.test.ts
        ├── cycle-detection.ts       # wouldCreateCycle(entities, childId, parentId)
        ├── cycle-detection.test.ts
        └── index.ts                 # public exports (contract surface)

apps/web/src/lib/
├── stores/vault/
│   ├── entities.ts                  # (reused) primitive add/remove connection
│   └── family-mutations.ts          # NEW: addFamilyLink/removeFamilyLink — write BOTH sides + cycle guard (uses @codex/family-engine)
├── stores/vault.svelte.ts           # EXPOSE family mutation methods (thin delegation)
├── components/entity-detail/
│   ├── detail-tabs.ts               # EXTEND: add "family" to entityDetailTabs
│   ├── DetailTabs.svelte            # EXTEND: render Family tab trigger/panel
│   ├── DetailFamilyTab.svelte       # NEW: tab wrapper, focus state, re-centre, collapse
│   ├── family-tree/
│   │   ├── FamilyTree.svelte        # NEW: layout container (pan, generations, mobile)
│   │   ├── FamilyMemberCard.svelte  # NEW: portrait, name, role, lifespan, living/deceased
│   │   └── EmptyFamilySlot.svelte   # NEW: connect-existing / create-new affordance
│   └── RelatedEntityModal.svelte    # (reused) entity search for "connect existing"
└── config/help-content.ts           # EXTEND: Family Tree help article + FeatureHint
```

**Structure Decision**: Web monorepo. Pure genealogy logic goes into the new `@codex/family-engine` package (Constitution I); `apps/web` adds a Family detail tab and family-aware vault mutations that orchestrate the engine plus the existing connection primitives. Schema gains three family connection types so links are first-class and derivable (spec Clarification: dedicated types).

## Complexity Tracking

No constitution violations — section intentionally empty.
