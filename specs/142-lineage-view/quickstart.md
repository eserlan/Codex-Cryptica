# Quickstart: Lineage View (142)

## Try it (once implemented)

1. `bun install && bun run dev` (from repo root; app at `apps/web`).
2. Open a world and create/pick a character with several generations of family (use the Family tab's empty slots to chain grandparent → parent → child → grandchild, add a partner or two, and give one ancestor a second child).
3. On the character: **Family tab → full-screen button (⤢) → "Lineage" toggle**.
4. Verify: all generations render in rows; partners sit beside their member; the second child appears as a collapsed **⊞ N hidden** branch; drag to pan, scroll/pinch to zoom.
5. Click a **⊞** to expand that branch; click "**Show all generations**" (Expand all) on a deep tree; use a card's re-centre action and confirm the chart rebuilds around it.
6. Mobile check: narrow viewport / touch device — pinch-zoom and drag-pan inside the canvas; the page behind must not scroll horizontally.

## Test-first development loop

```bash
# Engine (pure functions — write these tests first)
bun test packages/family-engine

# Component tests
bun test apps/web -- family
bun test apps/web -- lineage

# Gates before any commit (Constitution VI.3)
bun run lint && bun run test
```

Useful fixtures: `packages/family-engine/src/family-tree.test.ts` already builds entity maps with family connections — extend the same helper style for multi-generation fixtures (5-gen line, cadet branch, cousin marriage, deliberate cycle).

## Key files

| Purpose     | Path                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Traversal   | `packages/family-engine/src/lineage.ts`                                                                |
| Layout      | `packages/family-engine/src/lineage-layout.ts`                                                         |
| Canvas view | `apps/web/src/lib/components/entity-detail/family-tree/LineageView.svelte`                             |
| Pan/zoom    | `apps/web/src/lib/components/entity-detail/family-tree/PanZoomContainer.svelte` + `pan-zoom.svelte.ts` |
| Mode toggle | `apps/web/src/lib/components/entity-detail/DetailFamilyTab.svelte` (fullscreen dialog toolbar)         |
| Help entry  | `apps/web/src/lib/config/help-content.ts`                                                              |
| Contract    | `specs/142-lineage-view/contracts/lineage-engine.md`                                                   |

## Acceptance spot-checks (map to spec)

- 5-gen line fully rendered, correct rows → SC-002
- 200-member fixture stays interactive; actions < 1 s → SC-003
- Branch collapse/expand at depth ≥ 3 with hidden-count → SC-004
- One action reveals everything from a capped render → SC-009 (FR-010a)
- Cycle fixture renders without hang → SC-008 (FR-011)
- Bounded Family tab tests untouched and green → SC-006
