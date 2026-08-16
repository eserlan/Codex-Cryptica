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
