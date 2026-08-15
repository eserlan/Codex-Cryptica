import {
  parseAdventureSession,
  type AdventureSession,
  type AdventureStatus,
} from "@codex/adventure-engine";

export type AdventureLoadCondition =
  "normal" | "duplicate-active-conflict" | "unreadable";

export interface AdventureArchiveEntry {
  id: string;
  title: string;
  status: AdventureStatus | "unreadable";
  updatedAt?: string;
  loadCondition: AdventureLoadCondition;
  revision?: number;
}

export interface AdventureListResult {
  effectiveActiveId: string | null;
  entries: AdventureArchiveEntry[];
}

export type AdventureLoadResult =
  | { condition: "normal"; session: AdventureSession }
  | { condition: "duplicate-active-conflict"; session: AdventureSession }
  | { condition: "unreadable"; entry: AdventureArchiveEntry; error: Error };

export type AdventureSaveResult =
  { ok: true; session: AdventureSession } | { ok: false; error: Error };

export interface AdventureVaultRootResolver {
  (vaultId: string): Promise<FileSystemDirectoryHandle>;
}

function isSafeSessionId(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value) && value.length <= 160;
}

export class AdventureSessionRepository {
  private readonly writes = new Map<string, Promise<void>>();
  private rootResolver: AdventureVaultRootResolver;

  constructor(resolveVaultRoot: AdventureVaultRootResolver) {
    this.rootResolver = resolveVaultRoot;
  }

  setRootResolver(resolveVaultRoot: AdventureVaultRootResolver): void {
    this.rootResolver = resolveVaultRoot;
  }

  private async adventuresDirectory(vaultId: string, create = false) {
    const root = await this.rootResolver(vaultId);
    const codex = await root.getDirectoryHandle(".codex", { create });
    return codex.getDirectoryHandle("adventures", { create });
  }

  private async readFile(
    vaultId: string,
    id: string,
  ): Promise<AdventureSession> {
    if (!isSafeSessionId(id)) throw new Error("invalid-session-id");
    const directory = await this.adventuresDirectory(vaultId);
    const file = await directory.getFileHandle(`${id}.json`);
    const text = await (await file.getFile()).text();
    const session = parseAdventureSession(JSON.parse(text));
    if (session.id !== id || session.vaultId !== vaultId)
      throw new Error("vault-or-id-mismatch");
    return session;
  }

  async load(vaultId: string, sessionId: string): Promise<AdventureLoadResult> {
    try {
      const session = await this.readFile(vaultId, sessionId);
      const list = await this.list(vaultId);
      return {
        condition:
          session.status === "active" && list.effectiveActiveId !== session.id
            ? "duplicate-active-conflict"
            : "normal",
        session,
      };
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
        const session = await this.readFile(vaultId, id);
        entries.push({
          id: session.id,
          title: session.title,
          status: session.status,
          updatedAt: session.updatedAt,
          revision: session.revision,
          loadCondition: "normal",
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
    const effectiveActiveId = active[0]?.id ?? null;
    for (const entry of entries) {
      if (entry.status === "active" && entry.id !== effectiveActiveId) {
        entry.loadCondition = "duplicate-active-conflict";
      }
    }
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
      return { ok: true, session };
    } finally {
      release();
      if (this.writes.get(session.id) === queued)
        this.writes.delete(session.id);
    }
  }

  async archive(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
  ): Promise<AdventureSaveResult> {
    const loaded = await this.load(vaultId, sessionId);
    if (loaded.condition === "unreadable")
      return { ok: false, error: loaded.error };
    if (loaded.session.revision !== expectedRevision)
      return { ok: false, error: new Error("revision-conflict") };
    const archived: AdventureSession = {
      ...loaded.session,
      status: "archived",
      revision: loaded.session.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.save(expectedRevision, archived);
  }
}

export const adventureSessionRepository = new AdventureSessionRepository(
  async () => {
    throw new Error("A vault root resolver must be configured by the web app.");
  },
);
