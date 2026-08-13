# Research: Lineage View (142)

All Technical Context unknowns resolved. Decisions below reference the current codebase (verified 2026-07-16 on branch `142-lineage-view`).

## Decision 1: Extend `@codex/family-engine`, no new package

- **Decision**: Add `buildLineage()` and `layoutLineage()` to `packages/family-engine` alongside `buildFamilyTree()`.
- **Rationale**: Same domain, same `Entity` inputs, and direct reuse of existing internals (`toMember`, `relatedMembers`, `inverseFamilyType`) — Constitution III's DRY rule explicitly prefers importing over reimplementing. `relatedMembers`/`toMember` are currently module-private in `family-tree.ts`; they will be exported (or moved to a shared internal module) so `lineage.ts` reuses rather than copies them.
- **Alternatives considered**: New `@codex/lineage-engine` package — rejected: would duplicate member-building and bidirectional link reading; family-engine is small (~380 LOC of source) and cohesive.

## Decision 2: Traversal algorithm — generation-indexed BFS with visited set

- **Decision**: `buildLineage(focusId, entities, opts)` runs two BFS passes from the focus:
  - **Up**: per direct-line member, parents via `relatedMembers(…, "child_of")`, generation −1, −2, …
  - **Down**: children via `relatedMembers(…, "parent_of")`, generation +1, +2, …
  - **Partners**: `spouse_of` on every direct-line member, placed at that member's generation, never traversed through (spec FR-004).
  - **Sibling branches**: at each direct-line member, the other children of that member's parents (and explicit `sibling_of` at the focus generation, matching `buildFamilyTree`'s merge rule) become branch roots flagged `collapsedByDefault: true`. Expanding a branch traverses that root's descendants with the same down-pass (FR-003a).
  - A single `visited: Set<entityId>` spans both passes: a person reachable twice (cousin marriage) materialises once; later reaches are recorded as extra edges only (FR-011, "member appearing twice" edge case).
- **Rationale**: O(members × avg-connections) single-visit traversal; termination guaranteed on cyclic data by the visited set — no depth recursion, no stack overflow on very deep lines. Matches how `buildFamilyTree` already reads both link directions, so datasets with one-sided links behave identically in both modes.
- **Alternatives considered**: Recursive DFS — same complexity but risks deep-line stack limits and is harder to depth-cap cleanly. Reusing repeated `buildFamilyTree` calls per node — rejected: O(n²) (each call scans all entities for inverse links); `buildLineage` instead builds one adjacency index over `entities` up front and shares it across the traversal.

## Decision 3: Layout — pure deterministic genealogy layout, no cytoscape

- **Decision**: `layoutLineage(lineage, opts)` computes absolute `{x, y}` card positions and orthogonal connector polylines: one horizontal row per generation; couples placed adjacent as units; children grouped under the midpoint of their parent couple; subtree widths computed bottom-up then positioned top-down (tidy-tree style, simplified: no contour threading needed at this scale — greedy left-to-right packing per family unit with subtree-width reservation).
- **Rationale**: Extends 1702's research Decision 4 ("deterministic hierarchical, no physics engine") to dynasty scale. Pure function → straightforward TDD (Constitution II) and stable positions across renders (needed for collapse/expand not to shuffle the chart). Cytoscape/fcose (graph mode) gives non-deterministic positions and poor genealogy semantics (couples, generation rows).
- **Alternatives considered**: `d3-hierarchy` tree layout — handles single-parent trees, not couples/two-sided ancestry; adapting it costs more than the simple row packer. CSS grid/flex like `FamilyTree.svelte` — cannot express arbitrary-depth branching width without absolute positioning; rejected for this mode (it stays for the bounded tab).

## Decision 4: Rendering — positioned DOM cards + SVG edge layer (no bitmap canvas)

- **Decision**: `LineageView.svelte` renders an SVG layer for connector lines and absolutely-positioned `FamilyMemberCard` components on top, both inside one transformed layer (`translate(pan) scale(zoom)`).
- **Rationale**: Reuses the existing card (portrait, lifespan, deceased state, theming, tests) untouched; DOM keeps text crisp under transform, theme tokens apply, and click/keyboard targets work for "open entity"/"re-centre". 200 cards + ~400 SVG segments is well within DOM performance budget (graph mode renders comparable node counts via cytoscape's DOM/canvas hybrid).
- **Alternatives considered**: `<canvas>` bitmap rendering — faster at 10k+ nodes but forfeits card reuse, a11y, and theming; scale doesn't justify it (YAGNI).

## Decision 5: Pan/zoom — new lightweight container, reuse the map's pure zoom math

- **Decision**: New `PanZoomContainer.svelte` + `pan-zoom.svelte.ts` state module: Pointer Events with `setPointerCapture` for drag-pan; wheel zoom about the cursor delegating to the existing pure `getZoomViewportUpdate` from `apps/web/src/lib/components/map/map-view-helpers.ts`; pinch zoom from tracking two active pointers (distance ratio → zoom, midpoint → anchor). `touch-action: none` on the canvas so the page never scrolls/overflows behind it (FR-014).
- **Rationale**: The map's `MapInteractionManager` is hard-wired to `mapStore`/`mapSession`/fog/tokens — not reusable as a unit. Its pure zoom helper is, and importing it satisfies the constitution's reuse rule without dragging in map state. A generic pan/zoom dependency (e.g. `panzoom`) adds a dependency for ~100 lines of pointer math we already half-own.
- **Alternatives considered**: Extract map pan/zoom into a shared package first — rejected as scope creep (Karpathy rule 3); revisit if a third pan/zoom surface appears (constitution's rule-of-three). CSS `zoom` like the bounded tab — reflows layout and cannot pan; unsuitable for a canvas.

## Decision 6: Depth cap + Expand all semantics (FR-010 / FR-010a)

- **Decision**: `buildLineage` takes `{ maxUp?: number; maxDown?: number }`. Default initial render uses **N = 3** generations each way (tunable constant in the view, not the engine); beyond the cap the result reports `truncatedUp`/`truncatedDown` (`{ atGeneration, hiddenGenerations }`, per data-model.md) so the view draws "⌃ M more generations" expanders. Expanders raise the cap stepwise (+3); "Expand all" re-runs with no cap **and** marks all sibling branches expanded. Collapse state lives in a `Set<entityId>` of expanded branch roots + current caps, all transient component state.
- **Rationale**: Traversal is cheap (SC-003's 200 members traverse in well under a millisecond); the cap exists to bound _layout/DOM size on first paint_, so re-running traversal on expansion is simpler than incremental patching. Deterministic layout keeps already-visible cards stable across expansions (FR-010 "MUST NOT lose already-rendered state" → same positions for same visible set; viewport pan/zoom is preserved across re-layout).
- **Alternatives considered**: Virtualised rendering (only viewport-visible cards mounted) — premature at ≤ few hundred members; noted as the escape hatch if SC-003 fails on real data.

## Decision 7: Mode toggle placement & surfaces

- **Decision**: A "Family | Lineage" segmented toggle in the fullscreen `<dialog>` toolbar of `DetailFamilyTab.svelte` (rendered only when `isFullscreen`). Lineage mode replaces `treeBody()` inside the dialog with `<LineageView …>`; the `EmptyFamilySlot` editing row and zoom-buttons toolbar are hidden in Lineage mode (pan/zoom lives in the canvas; view-only per FR-013). Default mode on every dialog open is the bounded Family view (opt-in each time; no persistence — spec defers "remember last mode").
- **Rationale**: FR-001 pins entry to the existing full-screen view. `DetailFamilyTab` is consumed by both `EntityDetailPanel.svelte` and `ZenView.svelte`, so both surfaces gain the mode from one change (SC-001's two actions: fullscreen → toggle). Bounded `FamilyTree.svelte` remains untouched (SC-006).
- **Alternatives considered**: Separate route/top-level mode — rejected by spec assumption (no new navigation). Toggle also in the non-fullscreen tab — rejected: FR-001 scopes the mode to full screen, and the panel is too narrow for a dynasty canvas.

## Decision 8: Re-centre & focus handling

- **Decision**: Re-centre action on a card sets the same `focusId` state `DetailFamilyTab` already owns (shared by both modes), rebuilding the lineage around the new focus; the "← Back to {entity}" affordance carries over. Opening an entity uses the existing `onNavigate` prop (closes the dialog via existing navigation behaviour).
- **Rationale**: One focus concept across modes avoids divergent state; both FR-006/FR-009 fall out of existing wiring.

## Decision 9: Documentation & discoverability (Constitution VII)

- **Decision**: Add a Lineage section to the Family help entry in `apps/web/src/lib/config/help-content.ts`, and a `FeatureHint` shown on first entering Lineage mode ("Drag to pan, scroll or pinch to zoom, click ⊞ to expand a branch").
- **Rationale**: Constitution VII requires help content for major features; a pannable canvas with collapsed branches has non-obvious first-use interactions.

## Resolved unknowns

| Unknown                 | Resolution                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Depth-cap value N       | 3 generations each way initially, +3 per expander step; constant in the view layer (Decision 6) |
| Pan/zoom implementation | New lightweight container; reuse pure `getZoomViewportUpdate` (Decision 5)                      |
| Zen surface entry       | Automatic via shared `DetailFamilyTab` (Decision 7)                                             |
| Last-used-mode memory   | Not persisted in v1; dialog always opens in bounded Family view (Decision 7)                    |
| Layout engine           | Pure deterministic row/tidy layout in family-engine; no cytoscape, no d3 (Decision 3)           |
