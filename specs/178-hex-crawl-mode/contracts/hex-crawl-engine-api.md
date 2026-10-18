# Contract: `hex-crawl-engine` public API

Package: `packages/hex-crawl-engine`. It is framework-free, with no Svelte, DOM or browser storage. It depends on `map-engine`, `random-source-engine` and `zod`. Everything ambient (time, randomness, the model) is injected (Constitution VIII).

Types refer to [data-model.md](../data-model.md).

## Model and keys

```ts
toHexKey(hex: HexCoord): HexKey                       // "q,r"
parseHexKey(key: string): HexCoord | null             // null for anything malformed
normalizeHexCrawlState(raw: unknown): HexCrawlState   // never throws; drops invalid records/keys, clamps text limits
getHexRecord(state: HexCrawlState | undefined, hex: HexCoord): HexRecord | undefined
upsertHexRecord(state, hex, patch: Partial<HexRecord>, now: number): HexCrawlState   // immutable; sets updatedAt; prunes if empty
pruneHexRecord(record: HexRecord): HexRecord | null   // null when the record no longer meets the existence rule
countHexRecords(state: HexCrawlState | undefined): number
```

**Guarantees**

- `upsertHexRecord` never mutates its input.
- Writing `notes` is only possible through an explicit `notes` patch. No discovery function returns a patch containing `notes` (FR-027).
- Setting `explored: true` sets `exploredAt = now` if it was not explored before. `explored: false` clears `exploredAt`.

## Terrain

```ts
TERRAIN_CATALOGUE: Readonly<Record<TerrainId, { label: string; icon: string }>>
terrainLabel(t: Terrain): string
terrainIcon(t: Terrain): string            // Iconify class, "icon-[lucide--…]"; custom → map-pin
parseTerrainInput(input: string): Terrain | null   // matches presets case-insensitively, else custom (1–40 chars), "" → null
```

## State

```ts
deriveHexState(record: HexRecord | undefined, revealed: boolean): "unknown" | "seen" | "explored"
```

## Contents and proximity

```ts
pinsInHex(pins: readonly MapPin[], hex: HexCoord, entityExists: (id: string) => boolean): MapPin[]
selectNearestLocation(
  candidates: readonly { entityId: string; title: string; hex: HexCoord }[],
  hex: HexCoord,
  maxDistance?: number,        // default 2
): { entityId: string; title: string; distance: number } | null
```

Ties are broken deterministically: distance, then title, then id (FR-024a and its edge case).

## Context

```ts
buildHexContext(input: HexContextInput): HexContext
renderHexContext(ctx: HexContext): string    // ≤ 8,000 chars, deterministic truncation
```

`HexContextInput` carries plain data gathered by the web layer: the target hex and record, all map records, pinned entities as `{ entityId, title, type, summary, hex }`, the region entity, and the campaign context block. The engine never reads the vault itself.

## Discovery

```ts
type ModelRunner = (
  system: string,
  user: string,
  signal?: AbortSignal,
) => Promise<unknown>; // parsed JSON

class HexDiscoveryService {
  constructor(deps: { rng: () => number; clock: Clock });

  generate(input: {
    context: HexContext;
    terrain?: Terrain;
    aiDisabled: boolean;
    modelRunner?: ModelRunner;
    signal?: AbortSignal;
  }): Promise<{
    draft: HexDiscoveryDraft;
    fellBackToTables: boolean;
    failure?: "ai-failed";
  }>;

  regeneratePart(input: {
    part: DiscoveryPartId;
    draft: HexDiscoveryDraft;
    context: HexContext;
    terrain?: Terrain;
    aiDisabled: boolean;
    modelRunner?: ModelRunner;
    signal?: AbortSignal;
  }): Promise<{
    draft: HexDiscoveryDraft;
    fellBackToTables: boolean;
    failure?: "ai-failed";
  }>;

  rollFromTables(
    terrain: Terrain | undefined,
    factions: readonly string[],
  ): HexDiscoveryDraft;
}
```

**Behaviour**

| Condition                                        | Result                                                                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aiDisabled` or no `modelRunner`                 | `rollFromTables`. `source: "tables"`. Never calls the model (FR-030, FR-043).                                                                             |
| Model output passes `HexStockingSchema`          | Draft with `source: "ai"`, all parts `pending`.                                                                                                           |
| Model throws or output fails validation          | **No silent fallback.** Returns `failure: "ai-failed"` with the previous draft (or none), so the UI can offer Retry or "Roll on terrain tables" (FR-034). |
| `signal` aborted                                 | Rejects with an `AbortError`. Nothing is returned for persistence (FR-033).                                                                               |
| `regeneratePart`                                 | Changes only `parts[part]`. Every other part is byte-identical (FR-023).                                                                                  |
| Custom terrain or no terrain in `rollFromTables` | Uses the general tables. The caller is told via `usedGeneralTables: true` on the draft metadata (FR-030).                                                 |

The prompts instruct the model to treat the supplied context as canon and not contradict it, to avoid repeating entities already in the hex or its neighbours (FR-029), and to answer only with JSON matching the schema.

## Saving helpers

```ts
planDiscoverySave(input: {
  draft: HexDiscoveryDraft;
  part: "landmark" | "encounter";
  encounterType?: "event" | "note";       // default "event"
  proposedLink: { entityId: string } | null;
  linkTicked: boolean;
}): { entity: { type: "location" | "event" | "note"; title: string; content: string; status: "draft"; labels: string[] };
      link: { toEntityId: string; type: "related_to" } | null;
      draft: HexDiscoveryDraft }          // part marked "saved"

appendToAiNotes(record: HexRecord | undefined, part: "hazard" | "secret" | "atmosphere",
                draft: HexDiscoveryDraft, now: number): { patch: Pick<HexRecord, "aiNotes" | "draft" | "updatedAt"> }
matchFaction(name: string, factions: readonly { id: string; title: string }[]): { id: string } | null  // case-insensitive exact
planFactionSave(input: { draft: HexDiscoveryDraft; factionId: string; factionTitle: string;
                         savedEntityIds: readonly string[]; record: HexRecord | undefined; now: number })
  : { links: { fromEntityId: string; toEntityId: string; type: "related_to" }[];
      patch: Pick<HexRecord, "aiNotes" | "draft" | "updatedAt">;   // aiNotes gains "Faction presence: {factionTitle}"
      draft: HexDiscoveryDraft }                                    // factionPresence part saved; draft remembers factionId for later saves
```

Labels: `["hex-crawl-discovery", draft.parts[part].source === "ai" ? "ai-drafted" : "rolled"]` (FR-028).

## Test obligations (Constitution II)

The obligations come in pairs: a success case and a negative case for each. Covered:

- normalisation of malformed input;
- the existence rule and pruning;
- `exploredAt` set and clear;
- state derivation (all three states, plus fog off);
- terrain parsing;
- deterministic nearest-location tie-break;
- context limits and truncation;
- AI success, AI invalid output, AI throws, abort;
- table fallback for presets and for custom terrain;
- a part-only regeneration that leaves the other parts unchanged;
- no function writes `notes`.
