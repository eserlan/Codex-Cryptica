import {
  appendEntry as engineAppendEntry,
  createSection as engineCreateSection,
  endJournal as engineEndJournal,
  renameSection as engineRenameSection,
  startOrResumeJournal,
} from "session-journal-engine";
import type {
  JournalEntry,
  JournalEntryInput,
  JournalSection,
  SessionJournal,
} from "session-journal-engine";
import { getDB } from "../utils/idb";
import { vaultRegistry as defaultVaultRegistry } from "./vault-registry.svelte";
import { updateLastInternalChange } from "./vault/registry";
import {
  systemClock,
  systemIdGenerator,
  type Clock,
  type IdGenerator,
} from "$lib/utils/runtime-deps";

export type SessionJournalControlState = "start" | "open" | "resume";

/**
 * Session Journal (#3402 slice 1, #3406): start/open/end lifecycle, manual
 * notes, and optional sections for a persistent per-vault play log, glued to
 * the shared IndexedDB `session_journals` store.
 *
 * Every mutator (`start`, `open`, `appendEntry`, `createSection`,
 * `renameSection`, `end`) re-reads the current record from IndexedDB
 * immediately before merging its change and writing back — never from
 * `current`/`$state` alone. That discipline, not the storage shape, is what
 * satisfies FR-011's cross-tab guarantee (see
 * specs/163-session-journal/contracts/session-journal-store-api.md's
 * Concurrency Guarantee section).
 */
export class SessionJournalStore {
  /** The vault's current journal — active if one exists, else the most
   *  recently ended one, else undefined. */
  current = $state<SessionJournal | undefined>(undefined);
  /** All journals (active and ended) for the active vault, newest first. */
  allJournals = $state<SessionJournal[]>([]);
  /** Tracked in-memory only (spec FR-010: "opened" is a browser-session
   *  affordance, not a persisted field). */
  private openedInSession = $state(false);
  /** The section new entries go into — typed or captured (spec FR-032). Held
   *  here, not in the view, because most captures happen while the panel is
   *  closed. In memory only: it starts as no section after a reload. */
  private selectedSectionId = $state<string | undefined>(undefined);

  private vaultRegistry: typeof defaultVaultRegistry;
  private ids: IdGenerator;
  private clock: Clock;
  private loadVersion = 0;

  constructor(
    vaultRegistry: typeof defaultVaultRegistry = defaultVaultRegistry,
    ids: IdGenerator = systemIdGenerator,
    clock: Clock = systemClock,
  ) {
    this.vaultRegistry = vaultRegistry;
    this.ids = ids;
    this.clock = clock;

    $effect.root(() => {
      $effect(() => {
        const vaultId = this.vaultRegistry.activeVaultId;
        this.openedInSession = false;
        this.selectedSectionId = undefined;
        if (vaultId) {
          this.current = undefined;
          this.allJournals = [];
          void this.loadVault(vaultId);
        } else {
          this.loadVersion += 1;
          this.current = undefined;
          this.allJournals = [];
        }
      });
    });
  }

  /** The current section, or undefined for none. A stored id whose section no
   *  longer exists in the active journal reads as undefined. */
  get activeSectionId(): string | undefined {
    const journal = this.current;
    if (!journal || journal.status !== "active") return undefined;
    return journal.sections.some((s) => s.id === this.selectedSectionId)
      ? this.selectedSectionId
      : undefined;
  }

  /** Switches the current section. Passing undefined means no section; an id
   *  that is not a section of the current journal is ignored. */
  setActiveSection(id: string | undefined): void {
    if (id === undefined) {
      this.selectedSectionId = undefined;
    } else if (this.current?.sections.some((s) => s.id === id)) {
      this.selectedSectionId = id;
    }
  }

  /** Derived control state for the three-way UI affordance (spec FR-010). */
  get controlState(): SessionJournalControlState {
    if (!this.current || this.current.status === "ended") return "start";
    return this.openedInSession ? "open" : "resume";
  }

  private async loadVault(vaultId: string): Promise<void> {
    const version = ++this.loadVersion;
    try {
      const db = await getDB();
      const journals = await db.getAllFromIndex(
        "session_journals",
        "by-vault",
        vaultId,
      );
      // A vault switch or a newer refresh may have completed while IDB was
      // resolving. Never let an older snapshot replace the current vault.
      if (
        version !== this.loadVersion ||
        this.vaultRegistry.activeVaultId !== vaultId
      ) {
        return;
      }
      this.allJournals = journals.sort((a, b) => b.startedAt - a.startedAt);
      this.current =
        this.allJournals.find((j) => j.status === "active") ??
        this.allJournals[0];
    } catch (e) {
      console.error("[SessionJournalStore] Failed to load journals:", e);
    }
  }

  private async afterWrite(journal: SessionJournal): Promise<void> {
    await this.loadVault(journal.vaultId);
    // No typed `DurableVaultChange` variant exists for a journal edit, and a
    // write reported without one is treated as "could have touched anything"
    // — which conservatively requires the vault's *next* cloud backup push to
    // be a full one rather than a delta (FR-016).
    void updateLastInternalChange(journal.vaultId);
  }

  /**
   * Read, merge, and write inside one readwrite transaction. Separate IDB
   * get()/put() calls are insufficient: two tabs can otherwise read the same
   * version and the later put silently erases the earlier tab's update.
   */
  private async mutateLatest(
    id: string,
    update: (latest: SessionJournal) => SessionJournal,
  ): Promise<SessionJournal> {
    const db = await getDB();
    const tx = db.transaction("session_journals", "readwrite");
    let journal: SessionJournal;
    try {
      const latest = await tx.store.get(id);
      if (!latest) throw new Error("No active journal.");
      journal = update(latest);
      await tx.store.put(journal);
      await tx.done;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // The transaction may already have completed or aborted.
      }
      await tx.done.catch(() => undefined);
      throw error;
    }
    await this.afterWrite(journal);
    return journal;
  }

  /** FR-001, FR-013. Idempotent — returns the existing active journal if one
   *  already exists for the vault, rather than creating a second one.
   *  Marks the journal "opened" immediately (FR-010): a user who just
   *  clicked "Start Session Journal" is already looking at it, not stuck one
   *  more click away behind "Resume Session Journal". `open()` remains the
   *  separate action for picking a *pre-existing* active journal back up
   *  after a reload, when this browser session never called `start()`. */
  async start(): Promise<SessionJournal> {
    const vaultId = this.vaultRegistry.activeVaultId;
    if (!vaultId) throw new Error("No vault is open.");

    const db = await getDB();
    const tx = db.transaction("session_journals", "readwrite");
    const journals = await tx.store.index("by-vault").getAll(vaultId);
    const existing = journals.find((item) => item.status === "active");
    const journal = startOrResumeJournal(
      existing,
      vaultId,
      this.ids,
      this.clock,
    );
    if (!existing) {
      await tx.store.put(journal);
    }
    await tx.done;
    if (!existing) {
      await this.afterWrite(journal);
    } else {
      await this.loadVault(vaultId);
    }
    this.openedInSession = true;
    return journal;
  }

  /** FR-009. Marks the current active journal as "opened" for this browser
   *  session so `controlState` becomes `"open"`. No-op if there is no active
   *  journal, or it's already open. */
  open(): void {
    if (this.current && this.current.status === "active") {
      this.openedInSession = true;
    }
  }

  /** FR-002. Rejects if no journal is active, or if the active journal has
   *  ended. `entry` omits `id`/`timestamp`; the engine assigns both. */
  async appendEntry(entry: JournalEntryInput): Promise<JournalEntry> {
    if (!this.current) throw new Error("No active journal.");
    let created: JournalEntry | undefined;
    await this.mutateLatest(this.current.id, (latest) => {
      const result = engineAppendEntry(latest, entry, this.ids, this.clock);
      if (!result.ok) throw new Error(result.error);
      created = result.entry;
      return result.journal;
    });
    return created!;
  }

  /** FR-004. Returns the created section. */
  async createSection(name: string): Promise<JournalSection> {
    if (!this.current) throw new Error("No active journal.");
    let created: JournalSection | undefined;
    await this.mutateLatest(this.current.id, (latest) => {
      const result = engineCreateSection(latest, name, this.ids);
      if (!result.ok) throw new Error(result.error);
      created = result.section;
      return result.journal;
    });
    this.selectedSectionId = created!.id;
    return created!;
  }

  /** FR-005. Rejects (throws) for an empty/whitespace-only name; the
   *  section's prior name is unchanged on rejection. */
  async renameSection(sectionId: string, name: string): Promise<void> {
    if (!this.current) throw new Error("No active journal.");
    await this.mutateLatest(this.current.id, (latest) => {
      const result = engineRenameSection(latest, sectionId, name);
      if (!result.ok) throw new Error(result.error);
      return result.journal;
    });
  }

  /** FR-007. Rejects (throws) if no journal is currently active. */
  async end(): Promise<void> {
    if (!this.current) throw new Error("No active journal.");
    await this.mutateLatest(this.current.id, (latest) => {
      const result = engineEndJournal(latest, this.clock);
      if (!result.ok) throw new Error(result.error);
      return result.journal;
    });
    this.selectedSectionId = undefined;
  }

  /** Supports "browsable afterward" (spec Assumption) — every past journal
   *  for the active vault, newest first. */
  async listJournals(): Promise<SessionJournal[]> {
    const vaultId = this.vaultRegistry.activeVaultId;
    if (!vaultId) return [];
    await this.loadVault(vaultId);
    return this.allJournals;
  }
}

export const sessionJournalStore = new SessionJournalStore();
