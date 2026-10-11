import type { CaptureKind, SessionJournal } from "./types";

/** Every capture kind, in the order the Capture menu shows them (spec 174, FR-023). */
export const CAPTURE_KINDS: readonly CaptureKind[] = [
  "dice",
  "tables",
  "decks",
  "map-moves",
  "scenes",
  "oracle",
  "tension",
  "threads",
  "party",
  "generated",
];

const KIND_BY_ENTRY_TYPE: Record<string, CaptureKind> = {
  "dice-roll": "dice",
  "table-result": "tables",
  "card-draw": "decks",
  "map-move": "map-moves",
  scene: "scenes",
  "oracle-answer": "oracle",
  "random-event": "oracle",
  "tension-change": "tension",
  "thread-change": "threads",
  "party-change": "party",
  "generated-result": "generated",
  "generated-saved": "generated",
};

/**
 * The capture kind an entry type belongs to. Manual notes and any type not
 * listed here return null: they are always recorded, because the player wrote
 * them or they are not automatic captures.
 */
export function captureKindOf(entryType: string): CaptureKind | null {
  return KIND_BY_ENTRY_TYPE[entryType] ?? null;
}

/**
 * Whether an automatic entry of this type should be recorded in the journal.
 * Honours the per-kind switches and the older map-move flag, which still means
 * "map moves off" when set to false.
 */
export function isCaptured(
  journal: Pick<SessionJournal, "captureOff" | "captureMapMoves">,
  entryType: string,
): boolean {
  const kind = captureKindOf(entryType);
  if (kind === null) return true;
  if (journal.captureOff?.includes(kind)) return false;
  if (kind === "map-moves" && journal.captureMapMoves === false) return false;
  return true;
}

/** Returns the journal with one kind switched on or off, without duplicates. */
export function withCaptureChoice<J extends Pick<SessionJournal, "captureOff">>(
  journal: J,
  kind: CaptureKind,
  on: boolean,
): J {
  const current = journal.captureOff ?? [];
  const without = current.filter((k) => k !== kind);
  const next = on ? without : [...without, kind];
  // Keep the canonical order so stored data is stable.
  const ordered = CAPTURE_KINDS.filter((k) => next.includes(k));
  return { ...journal, captureOff: ordered.length ? ordered : undefined };
}
