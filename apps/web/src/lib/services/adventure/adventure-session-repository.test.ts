import { describe, expect, it, vi } from "vitest";
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
    undefined,
    now,
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
    const { repository, writes } = mockWritableRepository(archivedSession, () => fixedTime);

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
    const { repository, writes } = mockWritableRepository({
      ...archivedSession,
      status: "active",
      title: "Original",
    }, () => fixedTime);
    (repository as any).generateId = () => "session-copy";

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
