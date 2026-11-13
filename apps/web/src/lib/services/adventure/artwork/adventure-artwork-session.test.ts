import { describe, expect, it, vi } from "vitest";
import { AdventureArtworkSession } from "./adventure-artwork-session";

const session = () =>
  ({
    id: "s1",
    vaultId: "v1",
    revision: 3,
    places: [{ id: "p1" }],
    turns: [{ text: "kept" }],
  }) as never;
const context = { sessionId: "s1", vaultId: "v1", expectedRevision: 3 };
const subject = { kind: "place" as const, id: "p1" };

describe("adventure artwork session integration", () => {
  it("saves through the revision boundary and updates the active state", async () => {
    const state = {
      session: session(),
      readOnly: false,
      phase: "ready",
      lease: {},
    };
    const save = vi.fn(async (_revision, next) => ({
      ok: true as const,
      session: next,
    }));
    const adapter = new AdventureArtworkSession(state as never, {
      save,
      verify: async () => true,
    });
    expect(
      (await adapter.mutate(subject, { kind: "dismiss" }, context)).ok,
    ).toBe(true);
    expect(save).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ revision: 4, turns: [{ text: "kept" }] }),
    );
    expect(state.session).toEqual(
      expect.objectContaining({ revision: 4, artwork: expect.any(Object) }),
    );
  });
  it("rejects writes when control is lost or a turn is generating", async () => {
    const state = {
      session: session(),
      readOnly: false,
      phase: "ready",
      lease: {},
    };
    const save = vi.fn();
    const adapter = new AdventureArtworkSession(state as never, {
      save,
      verify: async () => false,
    });
    expect(
      (await adapter.mutate(subject, { kind: "dismiss" }, context)).ok,
    ).toBe(false);
    state.phase = "generating";
    expect(
      (await adapter.mutate(subject, { kind: "dismiss" }, context)).ok,
    ).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
  it("does not store a canonical place choice as a session-local preference", async () => {
    const state = {
      session: {
        id: "s1",
        vaultId: "v1",
        revision: 3,
        places: [{ id: "p1", sourceRecordId: "e1" }],
      },
      readOnly: false,
      phase: "ready",
      lease: {},
    };
    const save = vi.fn();
    const adapter = new AdventureArtworkSession(state as never, {
      save,
      verify: async () => true,
    });
    expect(await adapter.mutate(subject, { kind: "dismiss" }, context)).toEqual(
      { ok: false, reason: "unknown-subject" },
    );
    expect(save).not.toHaveBeenCalled();
  });
  it("never replaces a newly opened session when an old save completes", async () => {
    const state = {
      session: session(),
      readOnly: false,
      phase: "ready",
      lease: {},
    };
    const other = { id: "s2", vaultId: "v1", revision: 0 } as never;
    const adapter = new AdventureArtworkSession(state as never, {
      verify: async () => true,
      save: async (_revision, next) => {
        state.session = other;
        return { ok: true, session: next };
      },
    });
    await adapter.mutate(subject, { kind: "dismiss" }, context);
    expect(state.session).toBe(other);
  });
});
