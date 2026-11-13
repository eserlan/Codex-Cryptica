import {
  type IdGenerator,
  type Clock,
  systemIdGenerator,
  systemClock,
} from "#lib/utils/runtime-deps.js";
import {
  parseAdventureSessionForRecovery,
  type AdventureSessionReadResult,
  type AdventureSession,
  type AdventureStatus,
} from "@codex/adventure-engine";

export type AdventureLoadCondition =
  "normal" | "duplicate-active-conflict" | "migration-recovery" | "unreadable";

export interface AdventureArchiveEntry {
  id: string;
  title: string;
  status: AdventureStatus | "unreadable";
  updatedAt?: string;
  loadCondition: AdventureLoadCondition;
  revision?: number;
  /** Absent for unreadable entries. Included for client-side archive search (FR-003). */
  premise?: string;
}

export interface AdventureListResult {
  effectiveActiveId: string | null;
  entries: AdventureArchiveEntry[];
}

export type AdventureLoadResult =
  | { condition: "normal"; session: AdventureSession }
  | { condition: "duplicate-active-conflict"; session: AdventureSession }
  | {
      condition: "migration-recovery";
      session: AdventureSession;
      exportDocument: unknown;
    }
  | { condition: "unreadable"; entry: AdventureArchiveEntry; error: Error };

export type AdventureSaveResult =
  { ok: true; session: AdventureSession } | { ok: false; error: Error };
type WritableSessionResult =
  { ok: true; session: AdventureSession } | { ok: false; error: Error };

export type AdventureDeleteResult = { ok: true } | { ok: false; error: Error };

export type AdventureDuplicateResult =
  | { condition: "duplicated"; id: string }
  | { condition: "unreadable"; error: Error };

export interface AdventureVaultRootResolver {
  (vaultId: string): Promise<FileSystemDirectoryHandle>;
}

function isSafeSessionId(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value) && value.length <= 160;
}

export class AdventureSessionRepository {
  private readonly writes = new Map<string, Promise<void>>();
  private rootResolver: AdventureVaultRootResolver;
  private readonly idGenerator: IdGenerator;
  private readonly clock: Clock;
  private changeListener?: (vaultId: string) => Promise<void>;

  constructor(
    resolveVaultRoot: AdventureVaultRootResolver,
    deps: { idGenerator?: IdGenerator; clock?: Clock } = {},
  ) {
    this.rootResolver = resolveVaultRoot;
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
    this.clock = deps.clock ?? systemClock;
  }

  setRootResolver(resolveVaultRoot: AdventureVaultRootResolver): void {
    this.rootResolver = resolveVaultRoot;
  }

  setChangeListener(listener: (vaultId: string) => Promise<void>): void {
    this.changeListener = listener;
  }

  private async notifyChange(vaultId: string): Promise<void> {
    try {
      await this.changeListener?.(vaultId);
    } catch (error) {
      console.warn("[Adventure] Could not record backup change", error);
    }
  }

  private async adventuresDirectory(vaultId: string, create = false) {
    const root = await this.rootResolver(vaultId);
    const codex = await root.getDirectoryHandle(".codex", { create });
    return codex.getDirectoryHandle("adventures", { create });
  }

  private async readFile(
    vaultId: string,
    id: string,
  ): Promise<AdventureSessionReadResult> {
    if (!isSafeSessionId(id)) throw new Error("invalid-session-id");
    const directory = await this.adventuresDirectory(vaultId);
    const file = await directory.getFileHandle(`${id}.json`);
    const text = await (await file.getFile()).text();
    const session = parseAdventureSessionForRecovery(JSON.parse(text));
    if (session.session.id !== id || session.session.vaultId !== vaultId)
      throw new Error("vault-or-id-mismatch");
    return session;
  }

  private async openAdventuresDirectoryForRead(
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle | null> {
    const root = await this.rootResolver(vaultId);
    try {
      const codex = await root.getDirectoryHandle(".codex");
      return await codex.getDirectoryHandle("adventures");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "NotFoundError"
      ) {
        return null;
      }
      throw error;
    }
  }

  private async readBackupEntry(
    vaultId: string,
    name: string,
    handle: FileSystemFileHandle,
  ): Promise<Record<string, unknown>> {
    const id = name.slice(0, -5);
    if (!isSafeSessionId(id)) throw new Error("Invalid adventure filename");
    const raw: unknown = JSON.parse(await (await handle.getFile()).text());
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Unreadable adventure");
    }
    const parsed = parseAdventureSessionForRecovery(raw);
    if (parsed.session.id !== id || parsed.session.vaultId !== vaultId) {
      throw new Error("vault-or-id-mismatch");
    }
    return raw as Record<string, unknown>;
  }

  /** Read complete owner documents; unreadable files must not silently disappear from backup. */
  async readAllForBackup(
    vaultId: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>[]> {
    if (signal?.aborted) throw new Error("Backup cancelled");
    const directory = await this.openAdventuresDirectoryForRead(vaultId);
    if (!directory) return [];
    const documents: Record<string, unknown>[] = [];
    for await (const [name, handle] of (directory as any).entries()) {
      if (signal?.aborted) throw new Error("Backup cancelled");
      if (!name.endsWith(".json") || handle.kind !== "file") continue;
      documents.push(await this.readBackupEntry(vaultId, name, handle));
    }
    if (signal?.aborted) throw new Error("Backup cancelled");
    return documents;
  }

  async load(vaultId: string, sessionId: string): Promise<AdventureLoadResult> {
    try {
      const read = await this.readFile(vaultId, sessionId);
      const session = read.session;
      if (read.mode === "legacy-read-only-recovery") {
        return {
          condition: "migration-recovery",
          session,
          exportDocument: read.exportDocument,
        };
      }
      return { condition: "normal", session };
    } catch (cause) {
      return {
        condition: "unreadable",
        entry: {
          id: sessionId,
          title: "Unreadable adventure",
          status: "unreadable",
          loadCondition: "unreadable",
        },
        error: cause instanceof Error ? cause : new Error(String(cause)),
      };
    }
  }

  async list(vaultId: string): Promise<AdventureListResult> {
    const entries: AdventureArchiveEntry[] = [];
    let directory: FileSystemDirectoryHandle;
    try {
      directory = await this.adventuresDirectory(vaultId);
    } catch {
      return { effectiveActiveId: null, entries: [] };
    }
    for await (const [name, handle] of (directory as any).entries()) {
      if (!name.endsWith(".json") || handle.kind !== "file") continue;
      const id = name.slice(0, -5);
      try {
        const read = await this.readFile(vaultId, id);
        const session = read.session;
        entries.push({
          id: session.id,
          title: session.title,
          status: session.status,
          updatedAt: session.updatedAt,
          revision: session.revision,
          loadCondition:
            read.mode === "writable" ? "normal" : "migration-recovery",
          premise: session.premise,
        });
      } catch {
        entries.push({
          id,
          title: "Unreadable adventure",
          status: "unreadable",
          loadCondition: "unreadable",
        });
      }
    }
    const active = entries
      .filter((entry) => entry.status === "active" && entry.updatedAt)
      .sort((a, b) => b.updatedAt!.localeCompare(a.updatedAt!));
    // Several adventures can be active at once; this is the most recently played.
    const effectiveActiveId = active[0]?.id ?? null;
    entries.sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
    return { effectiveActiveId, entries };
  }

  async save(
    expectedRevision: number | null,
    session: AdventureSession,
  ): Promise<AdventureSaveResult> {
    if (!isSafeSessionId(session.id))
      return { ok: false, error: new Error("invalid-session-id") };
    const previous = this.writes.get(session.id) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => gate);
    this.writes.set(session.id, queued);
    await previous;
    try {
      const current = await this.load(session.vaultId, session.id);
      if (current.condition === "unreadable") {
        const listing = await this.list(session.vaultId);
        if (listing.entries.some((entry) => entry.id === session.id)) {
          return {
            ok: false,
            error: new Error("unreadable-session-preserved"),
          };
        }
      }
      if (current.condition === "migration-recovery") {
        return { ok: false, error: new Error("migration-recovery-read-only") };
      }
      if (
        expectedRevision !== null &&
        current.condition !== "unreadable" &&
        current.session.revision !== expectedRevision
      ) {
        return { ok: false, error: new Error("revision-conflict") };
      }
      const directory = await this.adventuresDirectory(session.vaultId, true);
      const handle = await directory.getFileHandle(`${session.id}.json`, {
        create: true,
      });
      const writable = await handle.createWritable();
      try {
        await writable.write(JSON.stringify(session));
        await writable.close();
      } catch (cause) {
        await writable.abort().catch(() => undefined);
        return {
          ok: false,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        };
      }
      await this.notifyChange(session.vaultId);
      return { ok: true, session };
    } finally {
      release();
      if (this.writes.get(session.id) === queued)
        this.writes.delete(session.id);
    }
  }

  private async loadWritableAtRevision(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
  ): Promise<WritableSessionResult> {
    const loaded = await this.loadWritableSession(vaultId, sessionId);
    if (!loaded.ok) return loaded;
    if (loaded.session.revision !== expectedRevision) {
      return { ok: false, error: new Error("revision-conflict") };
    }
    return loaded;
  }

  private async loadWritableSession(
    vaultId: string,
    sessionId: string,
  ): Promise<WritableSessionResult> {
    const loaded = await this.load(vaultId, sessionId);
    if (loaded.condition === "unreadable") {
      return { ok: false, error: loaded.error };
    }
    if (loaded.condition === "migration-recovery") {
      return { ok: false, error: new Error("migration-recovery-read-only") };
    }
    return { ok: true, session: loaded.session };
  }

  async archive(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
  ): Promise<AdventureSaveResult> {
    const loaded = await this.loadWritableAtRevision(
      vaultId,
      sessionId,
      expectedRevision,
    );
    if (!loaded.ok) return { ok: false, error: loaded.error };
    const archived: AdventureSession = {
      ...loaded.session,
      status: "archived",
      revision: loaded.session.revision + 1,
      updatedAt: new Date(this.clock.now()).toISOString(),
    };
    return this.save(expectedRevision, archived);
  }

  /**
   * Renames an adventure without altering its transcript, state, or source
   * references. Goes through the same optimistic-revision `save` path as
   * every other mutation, so a stale `expectedRevision` is rejected rather
   * than silently overwritten.
   */
  async rename(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
    title: string,
  ): Promise<AdventureSaveResult> {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: new Error("title-required") };
    }
    const loaded = await this.loadWritableAtRevision(
      vaultId,
      sessionId,
      expectedRevision,
    );
    if (!loaded.ok) return { ok: false, error: loaded.error };
    const renamed: AdventureSession = {
      ...loaded.session,
      title: trimmed,
      revision: loaded.session.revision + 1,
      updatedAt: new Date(this.clock.now()).toISOString(),
    };
    return this.save(expectedRevision, renamed);
  }

  /**
   * Deep-copies an adventure (transcript, visible state, hidden state,
   * source references, Phase 2 fields) into a new, independent archived
   * adventure. Never mutates the source document — the copy is written
   * under a freshly generated id.
   */
  async duplicate(
    vaultId: string,
    sessionId: string,
  ): Promise<AdventureDuplicateResult> {
    const loaded = await this.load(vaultId, sessionId);
    if (loaded.condition === "unreadable") {
      return { condition: "unreadable", error: loaded.error };
    }
    if (loaded.condition === "migration-recovery") {
      return {
        condition: "unreadable",
        error: new Error("migration-recovery-read-only"),
      };
    }
    const now = new Date(this.clock.now()).toISOString();
    const id = this.idGenerator.uuid();
    const duplicated: AdventureSession = {
      ...loaded.session,
      id,
      status: "archived",
      createdAt: now,
      updatedAt: now,
      revision: 0,
    };
    const result = await this.save(null, duplicated);
    if (!result.ok) {
      return { condition: "unreadable", error: result.error };
    }
    return { condition: "duplicated", id };
  }

  async deleteArchived(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
  ): Promise<AdventureDeleteResult> {
    if (!isSafeSessionId(sessionId)) {
      return { ok: false, error: new Error("invalid-session-id") };
    }
    const loaded = await this.loadWritableSession(vaultId, sessionId);
    if (!loaded.ok) return { ok: false, error: loaded.error };
    if (loaded.session.status !== "archived") {
      return {
        ok: false,
        error: new Error("active-session-cannot-be-deleted"),
      };
    }
    if (loaded.session.revision !== expectedRevision) {
      return { ok: false, error: new Error("revision-conflict") };
    }
    return this.removeSessionFile(vaultId, sessionId);
  }

  async deleteUnreadable(
    vaultId: string,
    sessionId: string,
  ): Promise<AdventureDeleteResult> {
    if (!isSafeSessionId(sessionId)) {
      return { ok: false, error: new Error("invalid-session-id") };
    }
    const loaded = await this.load(vaultId, sessionId);
    if (loaded.condition !== "unreadable") {
      return { ok: false, error: new Error("session-is-readable") };
    }
    return this.removeSessionFile(vaultId, sessionId);
  }

  private async removeSessionFile(
    vaultId: string,
    sessionId: string,
  ): Promise<AdventureDeleteResult> {
    try {
      const directory = await this.adventuresDirectory(vaultId);
      await directory.removeEntry(`${sessionId}.json`);
      await this.notifyChange(vaultId);
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof Error ? cause : new Error(String(cause)),
      };
    }
  }
}

export const adventureSessionRepository = new AdventureSessionRepository(
  async () => {
    throw new Error("A vault root resolver must be configured by the web app.");
  },
);
