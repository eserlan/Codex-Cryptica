import type { AppEventDefinition } from "@codex/events";

/**
 * Session Journal (#3402 slice 3, #3408): the one shared way for any feature
 * to say "this is worth a journal entry". A publisher emits `JOURNAL:CAPTURE`
 * and never imports the journal; the journal's listener turns each event into
 * an entry. A new source therefore needs no journal-side change (SC-011).
 *
 * Publishers MUST NOT set `metadata.sync`: a capture belongs to the tab that
 * made the roll, and `CrossTabBroadcaster` relays only `sync` events (FR-031).
 */
export const JOURNAL_EVENTS = {
  CAPTURE: "JOURNAL:CAPTURE",
} as const;

export interface JournalCapturePayload {
  /** Open string: "dice-roll" | "card-draw" | "table-result" today. */
  entryType: string;
  /** One-line, plain-language summary. Capped by `captureToEntryInput`. */
  content: string;
  /** Small, plain, JSON-safe reference to the source. Bounded by
   *  `captureToEntryInput`. */
  sourceRef?: Record<string, unknown>;
}

declare module "@codex/events" {
  interface AppEventRegistry {
    "JOURNAL:CAPTURE": AppEventDefinition<"journal", JournalCapturePayload>;
  }
}
