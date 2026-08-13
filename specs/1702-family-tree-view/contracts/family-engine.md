# Contract: `@codex/family-engine` public API

Pure, dependency-free (except `schema` types) genealogy logic. All functions are deterministic and side-effect free — the web layer performs writes. This is the surface exported from `packages/family-engine/src/index.ts`.

## Types

```ts
import type { Entity } from "schema";

export type FamilyConnectionType =
  "parent_of" | "child_of" | "spouse_of" | "sibling_of";

export type FamilyRelation =
  "focus" | "parent" | "child" | "partner" | "sibling";

export interface FamilyMember {
  entityId: string;
  name: string;
  role?: string;
  portraitUrl?: string;
  lifespan?: string;
  deceased: boolean;
  relation: FamilyRelation;
  generation: number;
  relationLabel?: string; // e.g. "Mother"/"Brother", from the connection label
  gender?: "male" | "female"; // derived from a "Male"/"Female" entity Label
}

export interface FamilyTree {
  focusId: string;
  focus: FamilyMember;
  parents: FamilyMember[];
  partners: FamilyMember[];
  children: FamilyMember[];
  siblings: FamilyMember[];
}
```

## Constants & type helpers

```ts
export const FAMILY_CONNECTION_TYPES: readonly FamilyConnectionType[];

// True if the given connection type string is one of the family types.
export function isFamilyType(type: string): type is FamilyConnectionType;

// parent_of <-> child_of; spouse_of -> spouse_of.
export function inverseFamilyType(
  type: FamilyConnectionType,
): FamilyConnectionType;
```

**Contract**:

- `inverseFamilyType("parent_of") === "child_of"`, `inverseFamilyType("child_of") === "parent_of"`, `inverseFamilyType("spouse_of") === "spouse_of"`.
- `isFamilyType` returns false for generic types (`"neutral"`, `"knows"`, custom strings, etc.).

## Tree derivation

```ts
// Build the derived family tree centred on focusId from an entity map.
export function buildFamilyTree(
  focusId: string,
  entities: Record<string, Entity>,
): FamilyTree;
```

**Contract**:

- Returns `parents`, `children`, `partners`, and `siblings` for `focusId`.
- **Siblings** combine explicit `sibling_of` links (which work with no known parents and may carry a Brother/Sister label) with those inferred from a shared parent; de-duplicated, explicit labels win, and never duplicated into another bucket.
- **`relationLabel`** on a member is the term describing that member relative to the focus (e.g. "Brother"), read from the member's own link back to the focus; undefined when unlabelled (e.g. inferred siblings).
- **`gender`** is derived from a case-insensitive "Male"/"Female" entity Label (Constitution XII: Labels over Tags, not a dedicated schema field); undefined when neither label is present. Excluded from `role`'s fallback label pick so it never doubles as a title.
- Reads family links from **either** direction (`parent_of` on A→B or `child_of` on B→A) and yields the same result.
- Skips links whose target entity is absent from `entities` (dangling links do not throw).
- Only entities of category `character` appear as members.
- Each `FamilyMember.deceased` reflects presence of a death/end date; `lifespan` is formatted from temporal metadata when available.
- Pure: does not mutate `entities`.

## Cycle detection

```ts
// True if adding "proposedParentId is parent of childId" would create circular ancestry.
export function wouldCreateCycle(
  entities: Record<string, Entity>,
  childId: string,
  proposedParentId: string,
): boolean;
```

**Contract**:

- Returns `true` if `proposedParentId === childId`.
- Returns `true` if `proposedParentId` is already a descendant of `childId` (walking `parent_of`/`child_of`).
- Returns `false` for a valid new parent link.
- Terminates on already-cyclic or malformed input (visited-set guard); never infinite-loops.
- Pure: does not mutate `entities`.

## Consumer expectations (web layer, not part of this package)

- `addFamilyLink(sourceId, targetId, type)` MUST call `wouldCreateCycle` first for parent/child links and reject on `true`.
- On success it MUST write both the link and `inverseFamilyType(type)` on the other entity.
- `removeFamilyLink` MUST remove both sides.
- Targets MUST be validated as `character` category before writing (FR-014).
