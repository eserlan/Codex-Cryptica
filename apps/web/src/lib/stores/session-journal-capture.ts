import type { AppEventBus } from "@codex/events";
import {
  JOURNAL_EVENTS,
  captureToEntryInput,
  type JournalEntryInput,
} from "session-journal-engine";

/** Fixed, so the subscription survives `AppEventBus.reset()` on vault switch. */
export const SESSION_JOURNAL_CAPTURE_LISTENER = "session-journal-capture";

/** The slice of `SessionJournalStore` the listener needs. */
export interface JournalCaptureTarget {
  readonly current: { status: string } | undefined;
  readonly activeSectionId: string | undefined;
  appendEntry(entry: JournalEntryInput): Promise<unknown>;
}

export interface SessionJournalCaptureDeps {
  store: JournalCaptureTarget;
  bus: AppEventBus;
  /** False in guest / player-facing sessions, where nothing is captured. */
  isCaptureAllowed: () => boolean;
  log?: (message: string, error: unknown) => void;
}

/**
 * Session Journal (#3402 slice 3, #3408): turns `JOURNAL:CAPTURE` events into
 * journal entries. It knows nothing about dice, tables or decks, which is what
 * lets a new source publish without any change here (SC-011).
 *
 * Quiet by design: with no active journal, in a guest session, or for a
 * malformed event it does nothing, and it never lets a failure reach the
 * feature that published the event (FR-029, FR-030).
 */
export class SessionJournalCapture {
  private readonly store: JournalCaptureTarget;
  private readonly bus: AppEventBus;
  private readonly isCaptureAllowed: () => boolean;
  private readonly log: (message: string, error: unknown) => void;
  private unsubscribe: (() => void) | null = null;
  /** Entries are saved one at a time, in the order the events arrived. */
  private queue: Promise<void> = Promise.resolve();

  constructor({
    store,
    bus,
    isCaptureAllowed,
    log = (message, error) => console.error(message, error),
  }: SessionJournalCaptureDeps) {
    this.store = store;
    this.bus = bus;
    this.isCaptureAllowed = isCaptureAllowed;
    this.log = log;
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe(
      JOURNAL_EVENTS.CAPTURE,
      (event) => this.handle(event),
      SESSION_JOURNAL_CAPTURE_LISTENER,
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private handle(event: {
    payload: Parameters<typeof captureToEntryInput>[0];
    metadata: { remote?: boolean };
  }): void {
    if (!this.isCaptureAllowed()) return;
    // A safeguard: capture events are never relayed, so this should not fire
    // (FR-031). If one ever arrives from another tab, that tab captured it.
    if (event.metadata?.remote) return;
    if (this.store.current?.status !== "active") return;

    const result = captureToEntryInput(
      event.payload,
      this.store.activeSectionId,
    );
    if (!result.ok) return;

    this.queue = this.queue.then(() => this.save(result.input));
  }

  private async save(input: JournalEntryInput): Promise<void> {
    // The journal may have ended while earlier entries were being saved.
    if (this.store.current?.status !== "active") return;
    try {
      await this.store.appendEntry(input);
    } catch (error) {
      this.log("[SessionJournalCapture] Could not record entry:", error);
    }
  }
}
