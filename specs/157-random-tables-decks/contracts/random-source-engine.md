# Contract: `packages/random-source-engine`

Public surface of the new package. Everything here is pure and offline
(FR-020, FR-030, FR-038): no network, no AI, no direct IndexedDB or filesystem
access. I/O is injected (Constitution VIII).

---

## `RandomSourceEngine`

```ts
class RandomSourceEngine {
  constructor(
    diceEngine?: DiceEngine, // defaults to a new DiceEngine()
    maxDepth?: number, // defaults to MAX_RESOLUTION_DEPTH (8)
  );

  /** Rolls one table. Never throws for cycles, depth, or missing targets. */
  roll(source: RandomSource, ctx: ResolutionContext): RollOutcome;

  /** Rolls several sources as one action (FR-017). */
  rollMany(sources: RandomSource[], ctx: ResolutionContext): RollOutcome;

  /** Re-resolves a single node of a prior outcome, leaving siblings intact (FR-019). */
  rerollFragment(
    outcome: RollOutcome,
    nodePath: number[],
    ctx: ResolutionContext,
  ): RollOutcome;
}
```

```ts
interface ResolutionContext {
  /** Name → source. Case-insensitive. Returns undefined for unresolved refs. */
  lookup(name: string): RandomSource | undefined;
}

interface RollOutcome {
  finalText: string;
  chain: ResolutionNode[];
  notices: Notice[]; // cycle / depth-limit / unresolved, user-facing copy
}
```

**Guarantees**

- Total: every input yields a `RollOutcome`. Cycles, depth exhaustion, and
  missing targets appear as `ResolutionNode.status` plus a `Notice`, never as a
  thrown error and never as silently dropped text (FR-014, FR-015, FR-016).
- Deterministic under a seeded `CryptoProvider` — the basis for testing SC-006
  and SC-008.
- **Side-effect free.** Resolving a `{deck}` reference samples with replacement
  and never touches `DeckState` (FR-012a). This is what makes `rerollFragment`
  safe to call repeatedly.

---

## `DeckService`

Deck draws are the only mutating operation in the feature.

```ts
class DeckService {
  constructor(store: DeckStateStore, diceEngine?: DiceEngine);

  draw(deck: RandomSource, count: number): Promise<DrawOutcome>;
  drawSpread(deck: RandomSource, spread: Spread): Promise<DrawOutcome>;
  reset(deck: RandomSource): Promise<void>; // clears the discard pile
  remaining(deck: RandomSource): Promise<Card[]>;
}

interface DrawOutcome {
  cards: Array<{ card: Card; reversed: boolean; resolved: RollOutcome }>;
  positions?: string[]; // present for spreads
  exhausted: boolean; // true when the request could not be filled
}
```

**Guarantees**

- `without-replacement` never returns a card already in the effective drawn set,
  including across two draws issued back-to-back (Edge Cases: concurrent draws) —
  enforced by serialising writes through `DeckStateStore`.
- A draw that cannot be filled returns `exhausted: true` with the cards it could
  deal and **does not** partially mutate state (FR-026); `drawSpread` checks
  capacity before dealing anything (FR-028).
- Card `body` references are resolved through `RandomSourceEngine` at draw time.

---

## `DeckStateStore`

The seam over the per-deck state file (R3). Implemented in `apps/web` against
the vault; mocked in package tests.

```ts
interface DeckStateStore {
  read(deckId: string): Promise<DeckState | undefined>;
  write(state: DeckState): Promise<void>;
}
```

**Contract note**: `read` returning `undefined` means an untouched deck — a full
deck with an empty discard pile — not an error. Implementations must serialise
writes so two rapid draws cannot interleave and lose one (Edge Cases: concurrent
draws).

---

## `parseRandomSource` / `serialiseRandomSource`

```ts
function parseRandomSource(markdown: string): ParseResult<RandomSource>;
function serialiseRandomSource(source: RandomSource): string;
```

Round-trip property: `parse(serialise(x))` deep-equals `x` for every valid
source. This is what keeps vault files hand-editable and export-safe.

---

## Import parsers

```ts
type ImportFormat = "lines" | "delimited" | "markdown-table";

function detectFormat(pasted: string): ImportFormat;
function parseImport(
  pasted: string,
  format: ImportFormat,
  mapping?: ColumnMapping,
): ImportPreview;

interface ImportPreview {
  mode: "weighted" | "ranged"; // from detected columns (FR-031/032)
  rows: Array<{
    raw: string;
    entry?: TableEntry;
    problem?: string; // per-row, never aborts the batch (FR-035)
  }>;
  columns: ColumnMapping; // user-correctable before save (FR-034)
}
```

**Guarantees**

- No row failure aborts an import; unparseable rows carry `problem` and are
  individually fixable, skippable, or acceptable (FR-035).
- `detectFormat` is a suggestion — the caller can always override the mapping.

---

## Validation

```ts
function validateSource(
  source: RandomSource,
  existingNames: string[],
): Diagnostic[];

interface Diagnostic {
  severity: "error" | "warning";
  code:
    | "duplicate-name"
    | "range-gap"
    | "range-overlap"
    | "unreachable-entry"
    | "broken-reference"
    | "malformed-reference";
  message: string; // plain language, Constitution IX
  entryId?: string;
}
```

Only `duplicate-name` is an `error` (blocks save, FR-003a). Every coverage
diagnostic is a `warning` — FR-006 requires reporting **without blocking**.

---

## Oracle intents

Added to `OracleIntent` in `packages/oracle-engine/src/types.ts`:

```ts
| { type: "roll-table"; sourceName: string }
| { type: "draw-deck"; sourceName: string; count?: number }
```

Parsed as `/table <name>` and `/deck <name> [count]`. **Not `/draw`** — that
intent is already routed to `visualizationExecutor` (R5). Unmatched names return
a message naming close matches (FR-040), computed with the existing fuzzy
matching in `search-engine` rather than a new implementation.
