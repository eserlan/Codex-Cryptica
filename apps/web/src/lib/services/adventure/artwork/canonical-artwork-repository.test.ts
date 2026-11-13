import { describe, expect, it, vi } from "vitest";
import { CanonicalArtworkRepository } from "./canonical-artwork-repository";
const context = { vaultId: "v1", sessionId: "s1", expectedRevision: 1 };
describe("canonical artwork repository", () => {
  it("reads under the shared lock and updates only the artwork field", async () => {
    const events: string[] = [];
    const update = vi.fn(async (_id, _patch) => true);
    const repo = new CanonicalArtworkRepository({
      lock: async (_key, action) => {
        events.push("lock");
        return action();
      },
      verify: async () => {
        events.push("verify");
      },
      read: async () => {
        events.push("read");
        return { id: "e1", title: "Harbour" };
      },
      update,
    });
    expect((await repo.mutate("e1", { kind: "dismiss" }, context)).ok).toBe(
      true,
    );
    expect(events).toEqual(["lock", "verify", "read", "verify"]);
    expect(update).toHaveBeenCalledWith("e1", {
      adventureArtwork: { version: 1, override: { kind: "dismissed" } },
    });
  });
  it("refuses unknown data and reports failed writes", async () => {
    const update = vi.fn(async () => false);
    const deps = {
      lock: async <T>(_key: string, action: () => Promise<T>) => action(),
      verify: async () => {},
      read: async () => ({ id: "e1", adventureArtwork: { version: 2 } }),
      update,
    };
    const repo = new CanonicalArtworkRepository(deps);
    expect((await repo.mutate("e1", { kind: "dismiss" }, context)).ok).toBe(
      false,
    );
    expect(update).not.toHaveBeenCalled();
    const failing = new CanonicalArtworkRepository({
      ...deps,
      read: async () => ({ id: "e1" }),
    });
    expect((await failing.mutate("e1", { kind: "dismiss" }, context)).ok).toBe(
      false,
    );
  });
});
