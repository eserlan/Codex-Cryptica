import type { Milestone } from "onboarding-journey-engine";
import type { VaultEvent } from "#lib/stores/vault/events.svelte.js";
import { SEARCH_ENTITY_FOCUS_EVENT } from "#lib/components/search/search-focus.js";
import type { Clock } from "#lib/utils/runtime-deps.js";

/** The journal capture event a generator save publishes (`publishGeneratedSaved`). */
const JOURNAL_CAPTURE = "JOURNAL:CAPTURE";

export interface MilestoneSources {
  vaultBus: {
    subscribe(listener: (event: VaultEvent) => void, name?: string): () => void;
  };
  appBus: {
    subscribe(
      filter: typeof JOURNAL_CAPTURE,
      listener: (event: { payload?: unknown }) => void,
    ): () => void;
  };
  target: Pick<EventTarget, "addEventListener" | "removeEventListener"> | null;
  clock: Clock;
  activeVaultId: () => string | null;
}

type Listener = (milestone: Milestone) => void;

/**
 * Turns events the app already emits into content-free journey milestones
 * (spec 175, research R2). It reads only the event type, a new entry's
 * category and a journal entry's type — never a name, text, id or label — and
 * keeps nothing.
 */
export class JourneyMilestones {
  private listener: Listener | null = null;
  private cleanup: (() => void) | null = null;

  constructor(private readonly sources: MilestoneSources) {}

  /** Starts listening. Calling it again replaces the listener. */
  start(listener: Listener): () => void {
    this.stop();
    this.listener = listener;
    const offVault = this.sources.vaultBus.subscribe((event) => {
      if (event.type === "BATCH_CREATED") {
        if (event.vaultId !== this.sources.activeVaultId()) return;
        const categories = new Set<string>();
        for (const entity of event.entities) {
          categories.add(String(entity.type));
        }
        for (const category of categories)
          this.emit({ kind: "entry-created", category });
      } else if (event.type === "CONNECTION_ADDED") {
        if (event.vaultId !== this.sources.activeVaultId()) return;
        this.emit({ kind: "connection-added" });
      }
    }, "onboarding-journey");
    const offApp = this.sources.appBus.subscribe(JOURNAL_CAPTURE, (event) => {
      const payload = event.payload as { entryType?: unknown } | undefined;
      if (payload?.entryType === "generated-saved") {
        this.emit({ kind: "generator-saved" });
      }
    });
    const onFound = () => this.recordEntryFound();
    this.sources.target?.addEventListener(SEARCH_ENTITY_FOCUS_EVENT, onFound);
    this.cleanup = () => {
      offVault();
      offApp();
      this.sources.target?.removeEventListener(
        SEARCH_ENTITY_FOCUS_EVENT,
        onFound,
      );
    };
    return () => this.stop();
  }

  stop(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.listener = null;
  }

  /** An entry was opened from the Explorer (search reports through its own event). */
  recordEntryFound(): void {
    this.emit({ kind: "entry-found" });
  }

  private emit(
    m:
      | { kind: "entry-created"; category: string }
      | { kind: "connection-added" }
      | { kind: "generator-saved" }
      | { kind: "entry-found" },
  ): void {
    this.listener?.({ ...m, at: this.sources.clock.now() } as Milestone);
  }
}
