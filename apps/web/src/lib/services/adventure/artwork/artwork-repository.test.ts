import { describe, expect, it, vi } from "vitest";
import { ArtworkRepository } from "./artwork-repository";
const subject = { kind: "place" as const, id: "p1" };
const context = { vaultId: "v1", sessionId: "s1", expectedRevision: 3 };
const session = { id: "s1", vaultId: "v1", revision: 3, title: "Original" };
describe("session artwork repository", () => {
  it("saves a narrow artwork change through the expected revision", async () => {
    const save = vi.fn(async (_revision, next) => ({
      ok: true as const,
      session: next,
    }));
    const repo = new ArtworkRepository({
      load: async () => session,
      verify: async () => {},
      isKnownSubject: () => true,
      save,
    });
    expect((await repo.mutate(subject, { kind: "dismiss" }, context)).ok).toBe(
      true,
    );
    expect(save).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        title: "Original",
        artwork: expect.objectContaining({ version: 1 }),
      }),
    );
  });
  it("refuses stale, unknown and failed writes", async () => {
    const save = vi.fn(async () => ({
      ok: false as const,
      error: new Error("failed"),
    }));
    const repo = new ArtworkRepository({
      load: async () => session,
      verify: async () => {},
      isKnownSubject: () => true,
      save,
    });
    expect(
      (
        await repo.mutate(
          subject,
          { kind: "dismiss" },
          { ...context, expectedRevision: 2 },
        )
      ).ok,
    ).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect((await repo.mutate(subject, { kind: "dismiss" }, context)).ok).toBe(
      false,
    );
    const opaque = new ArtworkRepository({
      load: async () => ({ ...session, artwork: { version: 2 } }),
      verify: async () => {},
      isKnownSubject: () => true,
      save,
    });
    expect(
      (await opaque.mutate(subject, { kind: "dismiss" }, context)).ok,
    ).toBe(false);
  });
});

it("rejects subjects that are not committed in the adventure", async () => {
  const save = vi.fn();
  const repo = new ArtworkRepository({
    load: async () => session,
    verify: async () => {},
    isKnownSubject: () => false,
    save,
  });
  expect(await repo.mutate(subject, { kind: "dismiss" }, context)).toEqual({
    ok: false,
    reason: "unknown-subject",
  });
  expect(save).not.toHaveBeenCalled();
});
