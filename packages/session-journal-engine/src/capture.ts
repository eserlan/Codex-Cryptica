import type { JournalCapturePayload } from "./events";
import type { JournalEntryInput } from "./types";

/**
 * Session Journal (#3402 slice 3, #3408): pure logic that turns a recorded
 * roll, draw or table result into a journal capture payload, and turns any
 * capture payload into a bounded, plain-data entry. No I/O, never throws.
 * See specs/163-session-journal/contracts/session-journal-store-api.md.
 */

/** Limits from the spec (FR-027). */
export const JOURNAL_CAPTURE_LIMITS = {
  /** Characters in an entry's one-line summary. */
  summary: 500,
  /** Characters of table or deck result text kept in the reference. */
  resultText: 1_000,
  /** Cards kept from a single draw. */
  maxCards: 30,
  /** Serialised size of the whole reference. */
  sourceRefBytes: 4_096,
} as const;

/**
 * The fields the engine reads from a recorded result. Structural, so the
 * engine depends on no app or dice-engine type.
 */
export interface CapturableRoll {
  total: number;
  parts: unknown[];
  formula?: string;
  label?: string;
  context: "chat" | "modal" | "table";
  source?: {
    sourceId: string;
    sourceName: string;
    kind: "table" | "deck";
    finalText: string;
    drawnCards?: Array<{ cardId: string; title: string; reversed: boolean }>;
  };
}

export type CaptureToEntryResult =
  { ok: true; input: JournalEntryInput } | { ok: false; error: string };

const ELLIPSIS = "…";

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + ELLIPSIS;
}

function describeCards(
  cards: Array<{ title: string; reversed: boolean }>,
): string {
  return cards
    .map((card) => (card.reversed ? `${card.title} (reversed)` : card.title))
    .join(", ");
}

/**
 * A recorded dice, table or deck result -> a capture payload, or `undefined`
 * when there is nothing worth recording.
 */
export function buildCaptureFromRoll(
  roll: CapturableRoll,
): JournalCapturePayload | undefined {
  const source = roll.source;

  if (source?.kind === "deck") {
    const cards = (source.drawnCards ?? [])
      .slice(0, JOURNAL_CAPTURE_LIMITS.maxCards)
      .map(({ cardId, title, reversed }) => ({ cardId, title, reversed }));
    const drawn = cards.length > 0 ? describeCards(cards) : "a card";
    return {
      entryType: "card-draw",
      content: `Drew ${drawn} from ${source.sourceName}`,
      sourceRef: {
        kind: "deck",
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        cards,
      },
    };
  }

  if (source) {
    const text = source.finalText.trim();
    if (!text) return undefined;
    return {
      entryType: "table-result",
      content: `${source.sourceName}: ${text}`,
      sourceRef: {
        kind: "table",
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        finalText: text,
        ...(roll.formula ? { formula: roll.formula } : {}),
        total: roll.total,
      },
    };
  }

  const formula = roll.formula?.trim() || "dice";
  const label = roll.label?.trim();
  return {
    entryType: "dice-roll",
    content: `${label ? `${label}: ` : ""}Rolled ${formula}: ${roll.total}`,
    sourceRef: {
      formula,
      total: roll.total,
      parts: roll.parts,
      ...(label ? { label } : {}),
    },
  };
}

const byteLength = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value)).length;

function plainArray(
  items: unknown[],
  seen: WeakSet<object>,
  key: string | undefined,
): unknown[] {
  const kept =
    key === "cards" ? items.slice(0, JOURNAL_CAPTURE_LIMITS.maxCards) : items;
  return kept.map((item) => toPlain(item, seen) ?? null);
}

function plainObject(
  value: Record<string, unknown>,
  seen: WeakSet<object>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "chain") continue;
    const plain = toPlain(v, seen, k);
    if (plain !== undefined) out[k] = plain;
  }
  return out;
}

function plainString(text: string, key: string | undefined): string {
  return key === "finalText"
    ? truncate(text, JOURNAL_CAPTURE_LIMITS.resultText)
    : text;
}

function plainContainer(
  value: object | null,
  seen: WeakSet<object>,
  key: string | undefined,
): unknown {
  if (value === null) return null;
  if (seen.has(value)) return undefined;
  seen.add(value);
  return Array.isArray(value)
    ? plainArray(value, seen, key)
    : plainObject(value as Record<string, unknown>, seen);
}

/**
 * Reduces any value to plain, JSON-safe data: functions, symbols, undefined
 * and cycles are dropped, a `chain` key is dropped wherever it appears, result
 * text and card lists are capped.
 */
function toPlain(value: unknown, seen: WeakSet<object>, key?: string): unknown {
  switch (typeof value) {
    case "string":
      return plainString(value, key);
    case "number":
      return Number.isFinite(value) ? value : null;
    case "boolean":
      return value;
    case "object":
      return plainContainer(value, seen, key);
    default:
      return undefined;
  }
}

function boundSourceRef(
  sourceRef: unknown,
): Record<string, unknown> | undefined {
  if (!sourceRef || typeof sourceRef !== "object" || Array.isArray(sourceRef)) {
    return undefined;
  }
  const plain = toPlain(sourceRef, new WeakSet()) as Record<string, unknown>;
  // Drop the largest top-level part until the whole reference fits.
  while (byteLength(plain) > JOURNAL_CAPTURE_LIMITS.sourceRefBytes) {
    const keys = Object.keys(plain);
    if (keys.length === 0) return undefined;
    const largest = keys.reduce((a, b) =>
      byteLength(plain[b]) > byteLength(plain[a]) ? b : a,
    );
    delete plain[largest];
  }
  return Object.keys(plain).length > 0 ? plain : undefined;
}

/**
 * Validates and bounds any capture payload into a journal entry input.
 * Unknown entry types are accepted unchanged, which is what lets a new source
 * publish without a journal-side change.
 */
export function captureToEntryInput(
  payload: JournalCapturePayload,
  sectionId?: string,
): CaptureToEntryResult {
  try {
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: "Nothing to record." };
    }
    const type =
      typeof payload.entryType === "string" ? payload.entryType.trim() : "";
    if (!type) return { ok: false, error: "A journal entry needs a type." };

    const content =
      typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content) return { ok: false, error: "A journal entry needs text." };

    const sourceRef = boundSourceRef(payload.sourceRef);
    return {
      ok: true,
      input: {
        type,
        content: truncate(content, JOURNAL_CAPTURE_LIMITS.summary),
        ...(sourceRef ? { sourceRef } : {}),
        ...(sectionId ? { sectionId } : {}),
      },
    };
  } catch {
    return { ok: false, error: "That could not be recorded." };
  }
}
