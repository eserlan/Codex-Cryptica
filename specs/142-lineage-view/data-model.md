# Data Model: Lineage View (142)

No persisted data changes. All structures below are derived at view time (spec FR-012) from existing `Entity` connections using the existing family connection kinds (`parent_of` / `child_of` / `spouse_of` / `sibling_of`, see `packages/family-engine/src/family-types.ts`).

## Engine types (new, `packages/family-engine`)

### `LineageMember`

Reuses the existing `FamilyMember` shape (built by the existing `toMember()`), extended with lineage placement:

| Field                      | Type                                                                     | Notes                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| …all `FamilyMember` fields |                                                                          | `entityId`, `name`, `role?`, `portraitUrl?`, `lifespan?`, `deceased`, `relationLabel?`, `gender?`          |
| `generation`               | `number`                                                                 | 0 = focus row; negative = ancestors, positive = descendants (same convention as `FamilyMember.generation`) |
| `kind`                     | `"focus" \| "ancestor" \| "descendant" \| "partner" \| "sibling-branch"` | How the member entered the lineage; partners never traversed through                                       |
| `branchRootId`             | `string \| undefined`                                                    | Set on members inside a sibling branch: the branch root's entityId (collapse unit)                         |

### `LineageEdge`

| Field         | Type                          | Notes                                                                                                                                               |
| ------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | `"parent-child" \| "partner"` | Sibling bonds are not drawn as edges; siblings hang off shared parents (or the focus row for explicit `sibling_of` with unknown parents)            |
| `from` / `to` | `string`                      | entityIds; `parent-child` directed parent → child                                                                                                   |
| `secondary`   | `boolean`                     | `true` when the target member was already materialised via another path (cousin-marriage duplicate reach, FR-011) — rendered but never re-traversed |

### `Lineage` (result of `buildLineage`)

| Field                           | Type                                                          | Notes                                                                                     |
| ------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `focusId`                       | `string`                                                      |                                                                                           |
| `members`                       | `Map<string, LineageMember>`                                  | Each person exactly once (visited-set)                                                    |
| `edges`                         | `LineageEdge[]`                                               |                                                                                           |
| `generations`                   | `Map<number, string[]>`                                       | Row index → member ids, deterministic order                                               |
| `siblingBranches`               | `Map<string, string[]>`                                       | Branch root id → member ids inside that collapsible branch                                |
| `truncatedUp` / `truncatedDown` | `{ atGeneration: number; hiddenGenerations: number } \| null` | Set when a depth cap cut recorded members (drives "M more generations" expanders, FR-010) |

### `BuildLineageOptions`

| Field              | Type                                | Default                | Notes                                                                                                  |
| ------------------ | ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `maxUp`            | `number \| undefined`               | `undefined` (uncapped) | Generations above focus to traverse; view passes its cap                                               |
| `maxDown`          | `number \| undefined`               | `undefined`            | Generations below focus                                                                                |
| `expandedBranches` | `Set<string> \| "all" \| undefined` | `undefined` (none)     | Which sibling-branch roots get their descendants traversed (FR-003a); `"all"` for Expand all (FR-010a) |

### `PositionedLineage` (result of `layoutLineage`)

| Field                 | Type                                                                         | Notes                                                                                    |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `cards`               | `Array<{ id: string; x: number; y: number }>`                                | Absolute positions, deterministic for identical input (stable across expansions, FR-010) |
| `edges`               | `Array<{ edge: LineageEdge; points: Array<{x,y}> }>`                         | Orthogonal polylines                                                                     |
| `collapsedIndicators` | `Array<{ branchRootId: string; x: number; y: number; hiddenCount: number }>` | "⊞ N hidden" markers for collapsed sibling branches (FR-008)                             |
| `bounds`              | `{ width: number; height: number }`                                          | For initial fit-to-viewport                                                              |

## View state (transient, `apps/web`)

| State                                    | Where                        | Notes                                                                   |
| ---------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `mode: "family" \| "lineage"`            | `DetailFamilyTab`            | Resets to `"family"` on dialog open; toggle only rendered in fullscreen |
| `focusId`                                | `DetailFamilyTab` (existing) | Shared by both modes; re-centre sets it                                 |
| `capUp` / `capDown`                      | `LineageView`                | Start at N=3; expander +3; `Infinity` after Expand all                  |
| `expandedBranches: Set<string> \| "all"` | `LineageView`                | Session-only (FR-008: need not persist)                                 |
| `viewport: { pan: {x,y}; zoom: number }` | `pan-zoom.svelte.ts`         | Preserved across re-layout (expansions don't reset the camera)          |

## Validation rules (from spec)

- Only `character`-type entities participate (reuses `isCharacter` guard); dangling connection targets skipped — same rules as `buildFamilyTree`.
- Traversal MUST visit each entityId at most once across both directions (FR-011); repeated reaches become `secondary` edges.
- Partners are placed, never traversed (FR-004).
- Sibling-branch members are absent from `members` while their branch is collapsed **except** the branch root itself, which always materialises (it is the collapse indicator's anchor and expansion target).
- `generations` ordering is deterministic: within a row, family units sorted by parent position, then members by name — guarantees stable layout (FR-010).

## State transitions

```text
mode: family → lineage (toggle; dialog only)  → back, state discarded on dialog close
branch: collapsed → expanded (per root; ⊞ click) → collapsible again (⊟)
caps:  {3,3} → +3 per expander → ∞ via Expand all (also sets expandedBranches = "all")
focus: focusId → any member id (re-centre) → back via existing "← Back to {entity}"
```
