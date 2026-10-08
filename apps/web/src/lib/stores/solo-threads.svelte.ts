import { untrack } from "svelte";
import {
  closeThread,
  createThread,
  editThread,
  linkEntity,
  pruneLinks,
  reopenThread,
  unlinkEntity,
  type Thread,
  type ThreadKind,
  type ThreadResult,
} from "solo-session-engine";
import {
  formatThreadChange,
  type JournalCapturePayload,
} from "session-journal-engine";
import {
  loadThreads,
  saveThreads,
  type VaultFileAccess,
} from "$lib/services/vault-threads-file";

export interface SoloThreadsDeps {
  /** The active vault, or null. */
  vaultId(): string | null;
  /** The vault's file access, or null when the vault has none (such as a guest). */
  files(vaultId: string): VaultFileAccess | null;
  /** True for a read-only vault: threads can be seen but not changed. */
  readOnly(): boolean;
  /** The ids of the vault's entries, for dropping links to deleted ones. */
  entityIds(): Set<string>;
  ids: { uuid(): string };
  clock: { now(): number };
  publishCapture(payload: JournalCapturePayload): void;
  notify(message: string): void;
}

/**
 * The vault's threads (spec 174, US3). Kept in memory and saved to the vault's
 * threads file. Writes are queued, so the file always holds the latest state.
 * A file that cannot be read is never overwritten.
 */
export class SoloThreadsStore {
  private items = $state<Thread[]>([]);
  private valid = $state(true);
  /** True while a vault's file is being read. Edits are refused then, so none reach the wrong vault. */
  private loading = $state(false);
  private loadedFor: string | null = null;
  private loadVersion = 0;
  private queue: Promise<void> = Promise.resolve();
  private deps: SoloThreadsDeps;

  constructor(deps: SoloThreadsDeps) {
    this.deps = deps;

    // Follow the active vault, so the threads shown always belong to it.
    $effect.root(() => {
      $effect(() => {
        const vaultId = this.deps.vaultId();
        untrack(() => void this.load(vaultId));
      });
    });
  }

  get threads(): Thread[] {
    return this.items;
  }

  get open(): Thread[] {
    return this.items.filter((t) => t.status === "open");
  }

  get closed(): Thread[] {
    return this.items.filter((t) => t.status === "closed");
  }

  /** False when the vault's threads file exists but cannot be read; edits are refused then. */
  get editable(): boolean {
    return !this.loading && this.valid && !this.deps.readOnly();
  }

  /**
   * Reads the threads for a vault. The previous vault's threads are cleared at
   * once, so none of them can be edited or saved into this vault. A load for an
   * older vault is discarded.
   */
  async load(vaultId: string | null): Promise<void> {
    const version = ++this.loadVersion;
    this.loadedFor = vaultId;
    this.items = [];
    this.valid = true;
    this.loading = true;
    try {
      const files = vaultId ? this.deps.files(vaultId) : null;
      if (!files) return;
      const result = await loadThreads(files);
      if (version !== this.loadVersion) return;
      this.valid = result.valid;
      this.items = pruneLinks(result.threads, this.deps.entityIds());
      if (!result.valid) this.unreadable();
    } catch {
      if (version !== this.loadVersion) return;
      this.valid = false;
      this.unreadable();
    } finally {
      if (version === this.loadVersion) this.loading = false;
    }
  }

  private unreadable(): void {
    this.deps.notify(
      "The threads file could not be read, so threads cannot be changed.",
    );
  }

  add(input: { title: string; kind: ThreadKind; note?: string }): ThreadResult {
    const refused = this.refuse();
    if (refused) return refused;
    const result = createThread(
      input,
      { ids: this.deps.ids, clock: this.deps.clock },
      this.items,
    );
    if (!result.ok) return result;
    this.commit([...this.items, result.thread]);
    this.journal(formatThreadChange("opened", result.thread));
    return result;
  }

  edit(
    id: string,
    changes: { title?: string; kind?: ThreadKind; note?: string },
  ): ThreadResult {
    return this.update(id, (thread) =>
      editThread(thread, changes, this.deps.clock),
    );
  }

  close(id: string, closingNote = ""): ThreadResult {
    const result = this.update(id, (thread) =>
      closeThread(thread, closingNote, this.deps.clock),
    );
    if (result.ok) this.journal(formatThreadChange("closed", result.thread));
    return result;
  }

  reopen(id: string): ThreadResult {
    const result = this.update(id, (thread) => ({
      ok: true,
      thread: reopenThread(thread, this.deps.clock),
    }));
    if (result.ok) this.journal(formatThreadChange("reopened", result.thread));
    return result;
  }

  link(id: string, entityId: string): ThreadResult {
    return this.update(id, (thread) =>
      linkEntity(thread, entityId, this.deps.clock),
    );
  }

  unlink(id: string, entityId: string): ThreadResult {
    return this.update(id, (thread) => ({
      ok: true,
      thread: unlinkEntity(thread, entityId, this.deps.clock),
    }));
  }

  remove(id: string): ThreadResult {
    const refused = this.refuse();
    if (refused) return refused;
    const removed = this.items.find((t) => t.id === id);
    if (!removed) return { ok: false, error: "That thread no longer exists." };
    this.commit(this.items.filter((t) => t.id !== id));
    return { ok: true, thread: removed };
  }

  private update(
    id: string,
    change: (thread: Thread) => ThreadResult,
  ): ThreadResult {
    const refused = this.refuse();
    if (refused) return refused;
    const current = this.items.find((t) => t.id === id);
    if (!current) return { ok: false, error: "That thread no longer exists." };
    const result = change(current);
    if (!result.ok) return result;
    this.commit(this.items.map((t) => (t.id === id ? result.thread : t)));
    return result;
  }

  private refuse(): { ok: false; error: string } | null {
    if (this.editable) return null;
    const error = this.loading
      ? "The vault's threads are still loading."
      : this.deps.readOnly()
        ? "This vault is read-only, so threads cannot be changed."
        : "The threads file could not be read, so threads cannot be changed.";
    this.deps.notify(error);
    return { ok: false, error };
  }

  private commit(next: Thread[]): void {
    this.items = next;
    const vaultId = this.loadedFor;
    if (!vaultId) return;
    const files = this.deps.files(vaultId);
    if (!files) return;
    // Each write carries its own snapshot and the vault it was made for, so a
    // vault switch can never move these threads into another vault's file.
    // Writes run in order, so the last one holds the newest state.
    this.queue = this.queue
      .then(() => saveThreads(files, next))
      .catch(() => {
        this.deps.notify(
          "The thread could not be saved to the vault. It is kept until you reload.",
        );
      });
  }

  private journal(payload: JournalCapturePayload): void {
    this.deps.publishCapture(payload);
  }
}
