import { describe, expect, it, vi } from "vitest";
import { parseAdventureSession } from "@codex/adventure-engine";
import { AdventureSessionRepository } from "./adventure-session-repository";

const archivedSession = {
  id: "session-1",
  vaultId: "vault-1",
  status: "archived",
  revision: 3,
};

describe("AdventureSessionRepository.deleteArchived", () => {
  it("removes an archived session after its revision is verified", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    const removeEntry = vi.fn(async () => undefined);
    (repository as any).load = vi.fn(async () => ({
      condition: "normal",
      session: archivedSession,
    }));
    (repository as any).adventuresDirectory = vi.fn(async () => ({
      removeEntry,
    }));

    await expect(
      repository.deleteArchived("vault-1", "session-1", 3),
    ).resolves.toEqual({ ok: true });
    expect(removeEntry).toHaveBeenCalledWith("session-1.json");
  });

  it("refuses to delete an active session", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    (repository as any).load = vi.fn(async () => ({
      condition: "normal",
      session: { ...archivedSession, status: "active" },
    }));
    (repository as any).adventuresDirectory = vi.fn();

    await expect(
      repository.deleteArchived("vault-1", "session-1", 3),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({
        message: "active-session-cannot-be-deleted",
      }),
    });
    expect((repository as any).adventuresDirectory).not.toHaveBeenCalled();
  });

  it("refuses to delete an archived migration-recovery session", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    const removeEntry = vi.fn();
    (repository as any).load = vi.fn(async () => ({
      condition: "migration-recovery",
      session: { ...archivedSession, status: "archived" },
      exportDocument: {},
    }));
    (repository as any).adventuresDirectory = vi.fn(async () => ({
      removeEntry,
    }));

    await expect(
      repository.deleteArchived("vault-1", "session-1", 3),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({
        message: "migration-recovery-read-only",
      }),
    });
    expect(removeEntry).not.toHaveBeenCalled();
  });
});

describe("AdventureSessionRepository.deleteUnreadable", () => {
  it("removes an unreadable session without attempting to parse it", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    const removeEntry = vi.fn(async () => undefined);
    (repository as any).load = vi.fn(async () => ({
      condition: "unreadable",
      entry: {},
      error: new Error("invalid-json"),
    }));
    (repository as any).adventuresDirectory = vi.fn(async () => ({
      removeEntry,
    }));

    await expect(
      repository.deleteUnreadable("vault-1", "broken-1"),
    ).resolves.toEqual({ ok: true });
    expect(removeEntry).toHaveBeenCalledWith("broken-1.json");
  });

  it("does not delete a readable session through the unreadable path", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    (repository as any).load = vi.fn(async () => ({
      condition: "normal",
      session: archivedSession,
    }));

    await expect(
      repository.deleteUnreadable("vault-1", "session-1"),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ message: "session-is-readable" }),
    });
  });
});

function mockWritableRepository(session: unknown, now?: () => number) {
  const repository = new AdventureSessionRepository(
    async () => {
      throw new Error("not used");
    },
    now ? { clock: { now } } : undefined,
  );
  const writes: string[] = [];
  (repository as any).load = vi.fn(async () => ({
    condition: "normal",
    session,
  }));
  (repository as any).adventuresDirectory = vi.fn(async () => ({
    getFileHandle: async () => ({
      createWritable: async () => ({
        write: async (data: string) => writes.push(data),
        close: async () => undefined,
      }),
    }),
  }));
  return { repository, writes };
}

describe("AdventureSessionRepository.rename", () => {
  it("rejects an empty title without writing", async () => {
    const { repository, writes } = mockWritableRepository(archivedSession);

    await expect(
      repository.rename("vault-1", "session-1", 3, "   "),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ message: "title-required" }),
    });
    expect(writes).toHaveLength(0);
  });

  it("rejects a stale revision without writing", async () => {
    const { repository, writes } = mockWritableRepository(archivedSession);

    await expect(
      repository.rename("vault-1", "session-1", 99, "New Title"),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ message: "revision-conflict" }),
    });
    expect(writes).toHaveLength(0);
  });

  it("saves the new title and bumps revision without touching other fields", async () => {
    const fixedTime = 1600000000000;
    const { repository, writes } = mockWritableRepository(
      archivedSession,
      () => fixedTime,
    );

    const result = await repository.rename(
      "vault-1",
      "session-1",
      3,
      "  New Title  ",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.title).toBe("New Title");
    expect(result.session.revision).toBe(4);
    expect(result.session.status).toBe(archivedSession.status);
    expect(result.session.updatedAt).toBe(new Date(fixedTime).toISOString());
    expect(writes).toHaveLength(1);
    const written = JSON.parse(writes[0]!);
    expect(written.updatedAt).toBe(new Date(fixedTime).toISOString());
  });
});

describe("AdventureSessionRepository.duplicate", () => {
  it("writes an independent copy under a fresh id, defaulted to archived", async () => {
    const fixedTime = 1600000000000;
    const { repository, writes } = mockWritableRepository(
      {
        ...archivedSession,
        status: "active",
        title: "Original",
      },
      () => fixedTime,
    );
    (repository as any).idGenerator = { uuid: () => "session-copy" };

    const result = await repository.duplicate("vault-1", "session-1");
    expect(result).toEqual({ condition: "duplicated", id: "session-copy" });
    expect(writes).toHaveLength(1);
    const written = JSON.parse(writes[0]!);
    expect(written.id).toBe("session-copy");
    expect(written.status).toBe("archived");
    expect(written.revision).toBe(0);
    expect(written.title).toBe("Original");
    expect(written.createdAt).toBe(new Date(fixedTime).toISOString());
    expect(written.updatedAt).toBe(new Date(fixedTime).toISOString());
  });

  it("surfaces an unreadable source without writing", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    (repository as any).load = vi.fn(async () => ({
      condition: "unreadable",
      entry: {},
      error: new Error("invalid-json"),
    }));

    const result = await repository.duplicate("vault-1", "broken-1");
    expect(result).toEqual({
      condition: "unreadable",
      error: expect.objectContaining({ message: "invalid-json" }),
    });
  });
});

describe("AdventureSessionRepository v3 persistence", () => {
  it("round-trips the scenario collection through the stored session document", async () => {
    const files = new Map<string, string>();
    const directory = {
      async getFileHandle(name: string, options?: { create?: boolean }) {
        if (!options?.create && !files.has(name))
          throw new Error("NotFoundError");
        return {
          kind: "file",
          async getFile() {
            return { text: async () => files.get(name) ?? "" };
          },
          async createWritable() {
            let contents = "";
            return {
              write: async (text: string) => {
                contents = text;
              },
              close: async () => {
                files.set(name, contents);
              },
              abort: async () => undefined,
            };
          },
        };
      },
      async getDirectoryHandle() {
        return this;
      },
      async removeEntry(name: string) {
        files.delete(name);
      },
      async *entries() {
        for (const name of files.keys()) yield [name, { kind: "file" }];
      },
    };
    const repository = new AdventureSessionRepository(
      async () => directory as never,
    );
    const at = "2026-11-01T10:00:00.000Z";
    const session = parseAdventureSession({
      schemaVersion: 3,
      id: "session-v3",
      vaultId: "vault-1",
      title: "World",
      status: "active",
      createdAt: at,
      updatedAt: at,
      lastPlayedAt: at,
      revision: 0,
      playerCharacter: { kind: "provisional", name: "A", description: "B" },
      premise: "P",
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      hiddenState: { secrets: [], gmThreads: [] },
      provisionalFacts: [],
      turns: [],
      pendingRoll: null,
      dicePresets: [],
      resourceCounters: [],
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [
          {
            version: 1,
            id: "scenario-1",
            origin: { kind: "manual", manualId: "manual-1" },
            playerVisible: { rumour: "A rumour", lead: "A lead" },
            gmOnly: { truth: "Hidden truth" },
            status: "open",
            knowledge: "unheard",
            events: [],
            anchorRefs: [],
            secretBindings: { truth: "secret-1", eventIds: {} },
            revealedSecretIds: [],
          },
        ],
      },
    });

    await expect(repository.save(null, session)).resolves.toMatchObject({
      ok: true,
    });
    const loaded = await repository.load("vault-1", "session-v3");
    expect(loaded).toMatchObject({
      condition: "normal",
      session: {
        schemaVersion: 3,
        scenarioCollection: {
          items: [{ id: "scenario-1", knowledge: "unheard" }],
        },
      },
    });
  });
});

describe("AdventureSessionRepository.list with several active adventures", () => {
  it("keeps every active adventure playable and picks the most recent", async () => {
    const repository = new AdventureSessionRepository(async () => {
      throw new Error("not used");
    });
    const sessions: Record<string, any> = {
      old: {
        id: "old",
        title: "Old",
        status: "active",
        updatedAt: "2026-01-01T00:00:00.000Z",
        revision: 1,
        premise: "p",
      },
      recent: {
        id: "recent",
        title: "Recent",
        status: "active",
        updatedAt: "2026-02-01T00:00:00.000Z",
        revision: 1,
        premise: "p",
      },
    };
    (repository as any).adventuresDirectory = vi.fn(async () => ({
      async *entries() {
        for (const id of Object.keys(sessions))
          yield [`${id}.json`, { kind: "file" }];
      },
    }));
    (repository as any).readFile = vi.fn(async (_v: string, id: string) => ({
      mode: "writable",
      session: sessions[id],
    }));

    const result = await repository.list("vault-1");
    expect(result.effectiveActiveId).toBe("recent");
    expect(result.entries.map((e) => e.loadCondition)).toEqual([
      "normal",
      "normal",
    ]);
  });
});
