import { describe, it, expect, vi } from "vitest";
import type { PromotionScope, SessionJournal } from "session-journal-engine";

// The singleton at the bottom of the module wires the real vault and
// scratchpad; these tests use injected fakes, so keep those out of the way.
vi.mock("./vault.svelte", () => ({
  vault: { createEntity: vi.fn(), selectedEntityId: null },
}));
vi.mock("./quicknote.svelte", () => ({
  quickNoteStore: { close: vi.fn() },
}));
vi.mock("./ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));

import { SessionJournalPromoter } from "./session-journal-promoter";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const journal: SessionJournal = deepFreeze({
  id: "j1",
  vaultId: "v1",
  title: "Session one",
  status: "ended",
  startedAt: 1,
  endedAt: 9,
  sections: [{ id: "s1", name: "The Ambush" }],
  entries: [
    {
      id: "e1",
      timestamp: 10,
      type: "manual-note",
      content: "The party arrives",
    },
    {
      id: "e2",
      timestamp: 20,
      type: "dice-roll",
      content: "Rolled 1d20: 14",
      sectionId: "s1",
    },
  ],
});

const formatTime = (t: number) => `T${t}`;

function make(overrides: Record<string, unknown> = {}) {
  const order: string[] = [];
  const deps = {
    createEntity: vi.fn(async () => {
      order.push("create");
      return "ent-1";
    }),
    openEntity: vi.fn(() => {
      order.push("open");
    }),
    closePanel: vi.fn(() => {
      order.push("close");
    }),
    notify: vi.fn(),
    log: vi.fn(),
    ...overrides,
  };
  return { promoter: new SessionJournalPromoter(deps as any), deps, order };
}

const ask = (
  promoter: SessionJournalPromoter,
  scope: PromotionScope,
  input: { type?: string; title?: string } = {},
) =>
  promoter.promote(journal, scope, {
    type: "note",
    title: "A name",
    formatTime,
    ...input,
  });

describe("SessionJournalPromoter", () => {
  it.each([
    [
      { kind: "entry", entryId: "e1" } as PromotionScope,
      "The party arrives",
      "journal:j1:entry:e1",
    ],
    [
      { kind: "section", sectionId: "s1" } as PromotionScope,
      "- T20 — Dice roll — Rolled 1d20: 14",
      "journal:j1:section:s1",
    ],
    [{ kind: "journal" } as PromotionScope, "# Session one", "journal:j1"],
    [
      { kind: "selection", entryIds: ["e1"], sectionIds: [] } as PromotionScope,
      "- T10 — The party arrives",
      "journal:j1:selection",
    ],
  ])(
    "creates one draft with only status, content and back-reference (%j)",
    async (scope, expectedContent, expectedSource) => {
      const { promoter, deps } = make();

      const result = await ask(promoter, scope, {
        type: "event",
        title: "Chosen name",
      });

      expect(result).toEqual({ ok: true, entityId: "ent-1" });
      expect(deps.createEntity).toHaveBeenCalledTimes(1);
      const [type, title, data] = deps.createEntity.mock.calls[0] as any[];
      expect(type).toBe("event");
      expect(title).toBe("Chosen name");
      expect(Object.keys(data).sort()).toEqual([
        "content",
        "discoverySource",
        "status",
      ]);
      expect(data.status).toBe("draft");
      expect(data.content).toContain(expectedContent);
      expect(data.discoverySource).toBe(expectedSource);
    },
  );

  it("creates, then opens the draft, then closes the panel (FR-040)", async () => {
    const { promoter, deps, order } = make();

    await ask(promoter, { kind: "journal" });

    expect(order).toEqual(["create", "open", "close"]);
    expect(deps.openEntity).toHaveBeenCalledWith("ent-1");
  });

  it("tells the user the draft exists, using the name they chose", async () => {
    const { promoter, deps } = make();

    await ask(promoter, { kind: "journal" }, { title: "Session report" });

    expect(deps.notify).toHaveBeenCalledWith("Created a draft: Session report");
  });

  it("does not announce a draft that was not made (negative)", async () => {
    const failed = make({
      createEntity: vi.fn().mockRejectedValue(new Error("nope")),
    });
    const refused = make();

    await ask(failed.promoter, { kind: "journal" });
    await ask(refused.promoter, { kind: "journal" }, { title: " " });

    expect(failed.deps.notify).not.toHaveBeenCalled();
    expect(refused.deps.notify).not.toHaveBeenCalled();
  });

  it("still succeeds if the message cannot be shown", async () => {
    const { promoter, deps } = make({
      notify: vi.fn(() => {
        throw new Error("no toast");
      }),
    });

    const result = await ask(promoter, { kind: "journal" });

    expect(result).toEqual({ ok: true, entityId: "ent-1" });
    expect(deps.log).toHaveBeenCalled();
  });

  it("trims the name it is given", async () => {
    const { promoter, deps } = make();
    await ask(promoter, { kind: "journal" }, { title: "  Padded  " });
    expect((deps.createEntity.mock.calls[0] as any[])[1]).toBe("Padded");
  });

  it("makes another entity when the same entry is promoted again", async () => {
    const { promoter, deps } = make();
    const scope: PromotionScope = { kind: "entry", entryId: "e1" };

    await ask(promoter, scope);
    await ask(promoter, scope);

    expect(deps.createEntity).toHaveBeenCalledTimes(2);
  });

  describe("does nothing and says why (negative)", () => {
    it.each([
      ["a blank name", { title: "   " }],
      ["an empty name", { title: "" }],
      ["a blank type", { type: "  " }],
    ])("for %s", async (_label, input) => {
      const { promoter, deps } = make();

      const result = await ask(promoter, { kind: "journal" }, input);

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.length).toBeGreaterThan(0);
      expect(deps.createEntity).not.toHaveBeenCalled();
      expect(deps.openEntity).not.toHaveBeenCalled();
      expect(deps.closePanel).not.toHaveBeenCalled();
    });

    it("for something with nothing to make", async () => {
      const { promoter, deps } = make();

      const result = await ask(promoter, {
        kind: "selection",
        entryIds: [],
        sectionIds: [],
      });

      expect(result).toEqual({
        ok: false,
        error: "There is nothing here to turn into an entity yet.",
      });
      expect(deps.createEntity).not.toHaveBeenCalled();
    });

    it("for a part of the journal that is gone", async () => {
      const { promoter, deps } = make();

      const result = await ask(promoter, { kind: "entry", entryId: "nope" });

      expect(result.ok).toBe(false);
      expect(deps.createEntity).not.toHaveBeenCalled();
    });
  });

  it("reports a failed create in plain language, logs it, and opens and closes nothing (FR-045)", async () => {
    const { promoter, deps } = make({
      createEntity: vi.fn().mockRejectedValue(new Error("vault not ready")),
    });

    const result = await ask(promoter, { kind: "journal" });

    expect(result).toEqual({
      ok: false,
      error: "That could not be made into an entity. Please try again.",
    });
    expect(deps.log).toHaveBeenCalledTimes(1);
    expect(deps.openEntity).not.toHaveBeenCalled();
    expect(deps.closePanel).not.toHaveBeenCalled();
  });

  it("still reports success if opening the draft fails, and logs it", async () => {
    const { promoter, deps } = make({
      openEntity: vi.fn(() => {
        throw new Error("no panel");
      }),
    });

    const result = await ask(promoter, { kind: "journal" });

    expect(result).toEqual({ ok: true, entityId: "ent-1" });
    expect(deps.log).toHaveBeenCalled();
  });

  it("never changes the journal it is given, in success or failure (SC-014)", async () => {
    // `journal` is deep-frozen, so any write would throw.
    const before = JSON.stringify(journal);
    const ok = make();
    const bad = make({ createEntity: vi.fn().mockRejectedValue(new Error()) });

    await ask(ok.promoter, { kind: "journal" });
    await ask(bad.promoter, { kind: "journal" });

    expect(JSON.stringify(journal)).toBe(before);
  });
});
