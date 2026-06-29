# Contract: `@codex/content-packs` public API

Framework-free package. No Svelte, no AI client, no `sessionStorage`, no direct store access
(Constitution I, V, VIII). Dependencies injected as plain arguments.

## Types

```ts
export interface CreaturePackEntry {
  title: string;
  description: string;
  habitat: string;
  behaviour: string;
  threatLevel: string;
  variants: string[];
  hooks: string[];
  combatNotes?: string;
}

export interface CreaturePack {
  id: string;
  name: string;
  description: string;
  genre: string;
  entries: CreaturePackEntry[];
}
```

## Registry

```ts
/** All available packs (P1: just the fantasy bestiary). */
export function listPacks(): CreaturePack[];

/** Look up a pack by id; undefined if not found. */
export function getPack(id: string): CreaturePack | undefined;
```

**Behaviour**:

- `listPacks()` returns a stable, non-empty array; each `id` unique.
- `getPack(unknown)` returns `undefined` (no throw).

## Mapper

```ts
import type { DiscoveredEntity } from "@codex/importer";

/**
 * Render a pack into importer DiscoveredEntity[] for the review step.
 * @param pack            the chosen pack
 * @param existingTitles  map of normalized existing entity title/id -> entity id,
 *                        used to flag duplicates (injected; no store access here)
 */
export function packToDiscoveredEntities(
  pack: CreaturePack,
  existingTitles?: Record<string, string>,
): DiscoveredEntity[];
```

**Contract guarantees** (tested):

- Output length equals `pack.entries.length`.
- Every item has `suggestedType === "Creature"`.
- Every item's `frontmatter.labels` includes `"creature-pack"`.
- `chronicle === entry.description`; `content`/`lore` contain the template section headings
  (Summary, Habitat, Behaviour, Threat Level, Variants, Story Hooks; Combat Notes only when present).
- `confidence === 1`; `detectedLinks === []` (P1).
- When `existingTitles` contains an entry's slug, that item's `matchedEntityId` is set to the mapped
  id; otherwise it is `undefined`.
- Pure: same inputs → same outputs; no side effects.
