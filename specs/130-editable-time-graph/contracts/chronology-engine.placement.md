# Contract: `chronology-engine` — meaning-sets, anchors, placement

Package: `packages/chronology-engine`. New modules `meaning-sets.ts`, `anchors.ts`, `placement.ts`; reuse `engine.ts` (`calendarEngine`, `parseDirectDateInput`).

## meaning-sets.ts

```ts
export interface Meaning {
  id: string; // e.g. "born", "founded", "custom"
  label: string; // plain natural-language label (Constitution IX)
  kind: "point" | "span";
  target: "date" | "start_date" | "end_date" | "anchor";
  anchorType?: string; // when target === "anchor"
  primary?: boolean; // the meaning that writes the legacy date field
  role?: "begin" | "end"; // category-correct begin/end concept (FR-016a)
}

export const MEANING_SETS: Record<string, Meaning[]>;
export function getMeanings(entityType: string): Meaning[]; // falls back to generic set
export function getBeginMeaning(entityType: string): Meaning; // the role:"begin" meaning
export function getEndMeaning(entityType: string): Meaning | undefined; // role:"end", if any
```

**Guarantees**:

1. Every supported type (`event`, `period`, `character`, `faction`, `location`, `item`, `note`) returns a non-empty, type-appropriate set (FR-016, SC-003).
2. Returned meanings differ across types (e.g. `character` ≠ `faction`) (US2 scenario 2).
3. Every set includes a universal `custom` meaning (FR-017).
4. Exactly one `primary: true` meaning per type, and it is the `role: "begin"` meaning (FR-016a).
5. `getBeginMeaning` returns the category-correct begin word (Character→`born`, Faction→`founded`, Item→`created`, Event→`date`); `getEndMeaning` returns the counterpart where applicable (Character→`died`, Faction→`dissolved`, Location→`destroyed`, Item→`lost`) or `undefined` (e.g. Note).
6. Unknown type → generic fallback set (no throw).

## anchors.ts

```ts
export function deriveProjectedAnchors(entity: Entity): ProjectedAnchor[];
export function validateRange(
  start: TemporalMetadata | undefined,
  end: TemporalMetadata | undefined,
): { ok: true } | { ok: false; reason: string };
export function upsertAnchor(
  anchors: TemporalAnchor[] | undefined,
  anchor: TemporalAnchor,
): TemporalAnchor[];
export function removeAnchor(
  anchors: TemporalAnchor[] | undefined,
  anchorId: string,
): TemporalAnchor[];
```

**Guarantees**:

1. `deriveProjectedAnchors` emits a `"primary"` projection from `date`/`start_date`+`end_date` **plus** one per `temporalAnchors[]` (FR-025, FR-028).
2. An entity with only `date` → exactly one projection (`kind: "point"`); with `start_date`+`end_date` → one `kind: "span"` (FR-026/FR-027).
3. `validateRange` rejects `end < start` with a reason; accepts equal or ascending (FR-031).
4. `upsertAnchor`/`removeAnchor` are pure, never mutate input, and never touch sibling anchors or primary fields (FR-023/FR-024).

## placement.ts

```ts
export interface PlacementIntent {
  entityId: string;
  meaning: Meaning;
  value: TemporalMetadata; // resolved point or span start
  endValue?: TemporalMetadata; // for spans
  writes: {
    field?: "date" | "start_date" | "end_date";
    anchor?: TemporalAnchor;
  };
  describesAs: string; // human summary for the popover ("Set event date to 605 P.C.")
  createEvent?: {
    // US7 — present only for the "create a linked event" option
    title: string; // pre-filled, editable ("{Entity} — {year}")
    date: TemporalMetadata; // = value (resolved year)
    anchorType: string; // anchor added to the source, e.g. "majorAppearance"
    connectionType: string; // e.g. "related_to"
  };
}

export function buildIntent(args: {
  entity: Entity;
  meaning: Meaning;
  targetYear: number;
  endYear?: number;
  anchorId?: string; // when updating an existing anchor
}): PlacementIntent;

export function detectConflict(
  originalValue: TemporalMetadata | undefined,
  currentValue: TemporalMetadata | undefined,
): boolean; // true ⇒ entity changed underneath (FR-032)
```

**Guarantees**:

1. `buildIntent` for an Event primary meaning targets the legacy `date` field and produces a direct `describesAs` (FR-013); for a non-primary meaning it produces an `anchor` write (FR-015/FR-022).
2. `buildIntent` never emits raw graph coordinates — only structured date/range/anchor writes (SC-008).
3. `detectConflict` returns false when values are calendar-equal, true otherwise (FR-032).
4. Span meanings yield both `value` and `endValue`; point meanings only `value` (FR-018).
5. When asked for the "create a linked event" option, `buildIntent` populates `createEvent` (title, date, anchorType, connectionType) and leaves the source entity's primary date/anchors untouched in `writes` (additive only, FR-038). The actual create/link is executed by the `ChronologyEditService` (engine stays pure — no vault access).
