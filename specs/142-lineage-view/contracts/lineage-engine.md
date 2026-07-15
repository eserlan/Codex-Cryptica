# Contract: `@codex/family-engine` lineage API (142)

New public exports from `packages/family-engine/src/index.ts`. Both functions are pure (no mutation of inputs, no I/O) and deterministic (identical inputs → identical outputs, including ordering).

## `buildLineage(focusId, entities, options?): Lineage`

```ts
function buildLineage(
  focusId: string,
  entities: Record<string, Entity>,
  options?: BuildLineageOptions, // { maxUp?, maxDown?, expandedBranches? }
): Lineage;
```

### Guarantees

1. **Totality**: never throws on arbitrary connection data — missing entities, non-character targets, one-sided links, self-links, and ancestry cycles all produce a well-formed `Lineage`.
2. **Single visit** (FR-011): every entityId appears at most once in `members`; a second reach of the same person adds an edge with `secondary: true` and does not extend traversal.
3. **Termination** (FR-011/SC-008): bounded by `O(|entities| + |connections|)` regardless of cycles.
4. **Direction rules**: ancestors via `child_of`, descendants via `parent_of`, both read bidirectionally (direct link or inverse link on the other entity — same semantics as `buildFamilyTree`); partners via `spouse_of`, placed at their partner's generation, never traversed through (FR-004).
5. **Sibling branches** (FR-003a): for every direct-line member, the other recorded children of that member's parents become branch roots (`kind: "sibling-branch"`, listed in `siblingBranches`); explicit `sibling_of` links of the focus add branch roots at generation 0 even with no shared recorded parent. Branch roots always materialise; their descendants only when the branch is in `expandedBranches` (or `"all"`).
6. **Depth caps** (FR-010): with `maxUp`/`maxDown` set, generations beyond the cap are not traversed and `truncatedUp`/`truncatedDown` report where and how many recorded generations were cut (`hiddenGenerations ≥ 1` only when members actually exist beyond the cap). Omitted caps traverse everything (FR-010a).
7. **Focus fallback**: unknown `focusId` yields a single-member lineage (same fallback shape as `buildFamilyTree`), enabling the empty state.
8. **Bounded-view consistency**: for any dataset, the members at generations −1…+1 (with all branches collapsed, no caps) are a superset-equal of `buildFamilyTree`'s parents/partners/children/siblings for the same focus — the modes never disagree about immediate family (US1 scenario 2).

## `layoutLineage(lineage, options?): PositionedLineage`

```ts
function layoutLineage(
  lineage: Lineage,
  options?: {
    cardWidth?: number; // default 112 (matches FamilyMemberCard)
    cardHeight?: number; // default 96
    hGap?: number; // default 16
    vGap?: number; // default 48
  },
): PositionedLineage;
```

### Guarantees

1. **Generation rows**: `cards` for generation g all share one y; rows ordered oldest (most negative) at top (FR-005).
2. **No overlaps**: card rectangles never intersect for any input.
3. **Couple adjacency**: a partner is horizontally adjacent to its direct-line member (FR-004); children centre under their parent couple's midpoint where space allows.
4. **Stability** (FR-010): positions depend only on the visible member set and options — expanding one branch does not reorder or reposition unrelated subtrees (their relative order is preserved; absolute x may shift only by the inserted branch's width).
5. **Collapsed indicators**: one entry per collapsed branch root with `hiddenCount` = recorded members hidden inside it (FR-008's "roughly how much" indicator).
6. **Bounds**: `bounds` tightly contains all cards and edge points (used for fit-to-view on open).

## UI contract (informal, `apps/web`)

- `LineageView.svelte` props: `{ focusId, entities, onOpen(id), onRecenter(id) }` — no mutation callbacks (view-only, FR-013).
- `PanZoomContainer.svelte`: emits nothing outside; owns `viewport` via `pan-zoom.svelte.ts`; sets `touch-action: none` and clips content (page never overflows, FR-014); exposes `fitTo(bounds)` for initial framing.
- `DetailFamilyTab.svelte`: `data-testid="family-mode-toggle"` segmented control rendered only in the fullscreen dialog; `data-testid="lineage-expand-all"` toolbar action; mode resets to Family on every dialog open.
- Test ids for tasks/tests: `lineage-canvas`, `lineage-card-{entityId}`, `lineage-branch-toggle-{entityId}`, `lineage-expander-up`, `lineage-expander-down`, `lineage-expand-all`, `family-mode-toggle`.
