/**
 * Content model for random tables and card decks (feature 157).
 *
 * A "Random Source" is the shared concept behind both: a named, user-authored
 * collection of possible results living in the vault. Tables and decks are two
 * modes of the same thing — they differ in how a result is selected and
 * presented, not in how they are stored, imported, searched, or exported.
 */

/** Inclusive numeric range over a die, used by ranged-mode tables. */
export interface Range {
  min: number;
  max: number;
}

/** A die, expressed by its number of sides. `d100` is `{ sides: 100 }`. */
export interface DieSpec {
  sides: number;
}

/**
 * A table is in exactly one selection mode and never mixes the two.
 *
 * Weighted and ranged are two views of the same underlying distribution, but
 * keeping them separate means coverage validation (gaps, overlaps) has a single
 * well-defined meaning: it applies to ranged tables, and weighted tables cannot
 * have gaps by construction.
 */
export type SelectionMode =
  { mode: "weighted" } | { mode: "ranged"; die: DieSpec };

export interface TableEntry {
  id: string;
  /** May embed `{reference}` tokens naming other sources. */
  text: string;
  /** Weighted mode only. Defaults to 1. */
  weight?: number;
  /** Ranged mode only. */
  range?: Range;
}

export interface Card {
  /**
   * Stable for the lifetime of the card. DeckState records draws by card id,
   * so regenerating ids on edit would silently reset every deck.
   */
  id: string;
  title: string;
  /** May embed `{reference}` tokens (FR-012). */
  body: string;
  /** Vault-relative path, resolved through the vault's AssetManager. */
  imagePath?: string;
  /** Shown instead of `body` when the card is drawn reversed (FR-027). */
  reversedMeaning?: string;
}

export interface DeckOptions {
  drawMode: "with-replacement" | "without-replacement";
  allowReversals: boolean;
}

export interface Spread {
  id: string;
  name: string;
  /** Ordered position labels; length is the number of cards drawn. */
  positions: string[];
}

export interface RandomSource {
  id: string;
  /** Unique per vault (FR-003a) — references bind by name, not by id. */
  name: string;
  kind: "table" | "deck";
  description?: string;
  /** Organisation. "Labels", never "tags" (Constitution XII). */
  labels: string[];
  /** Tables only. */
  selection?: SelectionMode;
  /** Tables only. */
  entries?: TableEntry[];
  /** Decks only. */
  cards?: Card[];
  /** Decks only. */
  deckOptions?: DeckOptions;
  /** Decks only. */
  spreads?: Spread[];
}

/**
 * Per-deck draw state, stored beside the deck rather than inside it so that a
 * draw never rewrites the authored definition.
 *
 * No merge rule, no device identity, no generation counter: Google Drive
 * transfer is an explicit whole-vault push/pull, never live sync, so two
 * devices are never holding the same deck at once (research R3).
 */
export interface DeckState {
  deckId: string;
  /** Card ids currently in the discard pile. */
  drawn: string[];
  updatedAt: number;
}

/** A parsed `{name}` token found in entry or card text. */
export interface Reference {
  raw: string;
  name: string;
  start: number;
  end: number;
}

export type ResolutionStatus = "ok" | "cycle" | "depth-limit" | "unresolved";

/**
 * One node of the resolution chain. Failure modes are carried as data rather
 * than thrown, so a roll always yields a usable result with a visible marker
 * (FR-014, FR-015, FR-016).
 */
export interface ResolutionNode {
  sourceName: string;
  sourceKind: "table" | "deck";
  /** Tables only. */
  dieValue?: number;
  text: string;
  /**
   * The selected entry's raw text, before references were substituted. Kept so
   * a single fragment can be re-rolled and the parent recomposed (FR-019).
   */
  template?: string;
  children: ResolutionNode[];
  status: ResolutionStatus;
}

export interface Notice {
  kind: Exclude<ResolutionStatus, "ok">;
  /** Plain language, shown directly to the user (Constitution IX). */
  message: string;
  sourceName?: string;
}

export interface RollOutcome {
  finalText: string;
  chain: ResolutionNode[];
  notices: Notice[];
}

export type DiagnosticCode =
  | "duplicate-name"
  | "empty-source"
  | "range-gap"
  | "range-overlap"
  | "unreachable-entry"
  | "broken-reference"
  | "malformed-reference";

export interface Diagnostic {
  severity: "error" | "warning";
  code: DiagnosticCode;
  message: string;
  entryId?: string;
}

/** Name → source lookup used during resolution. Case-insensitive. */
export interface ResolutionContext {
  lookup(name: string): RandomSource | undefined;
}

/**
 * Fixed, generous nesting cap. Deep enough that no hand-authored chain reaches
 * it, shallow enough to guarantee termination.
 *
 * Cycles are detected separately with a visited set, because a cycle and
 * legitimate deep nesting need different messages (research R8).
 */
export const MAX_RESOLUTION_DEPTH = 8;
