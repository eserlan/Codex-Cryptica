# Phase 1 Data Model: Family Tree View

No new persisted entity is introduced. Family relationships are stored inside each entity's existing `connections[]` array using new connection types. The Family Tree is a **derived** structure computed at view time.

## 1. Connection type extension (persisted)

`packages/schema/src/connection.ts` — extend `ConnectionTypeSchema`:

| New type     | Meaning (source → target)                                   | Inverse type | Symmetric |
| ------------ | ----------------------------------------------------------- | ------------ | --------- |
| `parent_of`  | source is parent of target                                  | `child_of`   | no        |
| `child_of`   | source is child of target                                   | `parent_of`  | no        |
| `spouse_of`  | source is spouse/partner of target                          | `spouse_of`  | yes       |
| `sibling_of` | source is sibling of target (optional Brother/Sister label) | `sibling_of` | yes       |

- Additive to the existing enum; existing connections and custom string types are unaffected.
- A family link is represented by **two** stored `Connection` records (one on each entity) that are inverses of each other. Invariant maintained by `addFamilyLink` / `removeFamilyLink`.

### Connection record (unchanged shape)

```
Connection {
  target: string        // target entity id
  type: string          // now may be parent_of | child_of | spouse_of
  strength: number      // default 1 (family links use 1)
  label?: string        // optional human label, e.g. "Mother" (display only, not source of truth)
}
```

## 2. Derived structures (not persisted)

Produced by `@codex/family-engine` from the entity map.

### FamilyMember

```
FamilyMember {
  entityId: string
  name: string          // entity title
  role?: string         // title/role text if present
  portraitUrl?: string  // entity image or undefined → placeholder
  lifespan?: string     // formatted Born/Died via existing temporal helper
  deceased: boolean     // true if a death/end date (deceased Label) is present
  relation: "focus" | "parent" | "child" | "partner" | "sibling"
  relationLabel?: string        // e.g. "Brother"/"Sister"/"Mother" from the link
  gender?: "male" | "female"    // derived from a "Male"/"Female" entity Label
  generation: number    // relative to focus: parents -1, focus 0, children +1, etc.
}
```

### FamilyTree

```
FamilyTree {
  focusId: string
  focus: FamilyMember
  parents: FamilyMember[]
  partners: FamilyMember[]
  children: FamilyMember[]
  siblings: FamilyMember[]      // explicit sibling_of + inferred (shared parents)
  // For deeper navigation, ancestors/descendants are reachable by re-centring
}
```

## 3. Derivation rules

- **Parents of X**: entities that have a `parent_of` link targeting X (or X has a `child_of` link targeting them). Both representations are reconciled; with the two-sided invariant they agree.
- **Children of X**: inverse of parents.
- **Partners of X**: entities linked to X via `spouse_of` (symmetric).
- **Siblings of X**: the union of explicit `sibling_of` links to X (which may carry a Brother/Sister label) and entities (≠ X) that share at least one parent with X (inferred). De-duplicated; explicit labels win. A member that is already a parent/child/partner of X is not also listed as a sibling.
- **relationLabel**: read from the connection that describes the other person (the other entity's link back to X), e.g. a parent's `parent_of` labelled "Father" or a sibling's `sibling_of` labelled "Sister".
- **gender**: derived from a case-insensitive "Male"/"Female" entity Label, if present (no dedicated schema field, consistent with Constitution XII: Labels over Tags); excluded from the `role` fallback so it never doubles as a title.
- **Generation**: focus = 0; each `parent_of` step upward = −1; each `child_of` step downward = +1.
- **Living/deceased**: `deceased = true` when the entity carries a death/end date (deceased Label); otherwise living.

## 4. Validation & invariants

- **FR-011 (both sides)**: every `parent_of` on A→B implies a `child_of` on B→A; every `spouse_of` on A→B implies a `spouse_of` on B→A. Enforced by family mutations.
- **FR-013 (no cycles — hard block)**: `wouldCreateCycle(entities, childId, proposedParentId)` returns true if `proposedParentId` is `childId` itself or any descendant of `childId`; the mutation is rejected before any write, with an explanatory error.
- **FR-014 (characters only)**: family mutations reject targets whose category is not `character`.
- **Reconciliation**: if legacy/imported data has a one-sided family link, the tree renderer still derives correctly by reading either direction; editing that link normalises both sides.

## 5. Affected persisted schema summary

| File                                | Change                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `packages/schema/src/connection.ts` | Add `parent_of`, `child_of`, `spouse_of`, `sibling_of` to `ConnectionTypeSchema` |

No migration required (additive enum; no existing rows change).
