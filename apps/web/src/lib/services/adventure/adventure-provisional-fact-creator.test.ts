import { describe, expect, it, vi } from "vitest";
import {
  batchFilterPromotableFacts,
  createAdventureEntityDraft,
  promoteProvisionalFacts,
  type FactPromotionDeps,
} from "./adventure-provisional-fact-creator";

const playerVisibleFact = {
  id: "barrow",
  kind: "place" as const,
  name: "The Sunken Barrow",
  summary: "An ancient barrow flooded by the rising marsh.",
  introducedOnTurnId: "turn-1",
  visibility: "player-visible" as const,
};

describe("createAdventureEntityDraft", () => {
  it("creates a normal Codex draft from a player-visible adventure fact", () => {
    expect(
      createAdventureEntityDraft(playerVisibleFact, "The Drowned March"),
    ).toEqual({
      type: "location",
      title: "The Sunken Barrow",
      initialData: {
        content:
          "An ancient barrow flooded by the rising marsh.\n\n*Introduced during the adventure “The Drowned March”.*",
      },
    });
  });

  it("never creates a draft from GM-only information", () => {
    expect(
      createAdventureEntityDraft(
        { ...playerVisibleFact, visibility: "gm-only" },
        "The Drowned March",
      ),
    ).toBeNull();
  });
});

describe("batchFilterPromotableFacts", () => {
  it("filters out GM-only facts", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "secret",
        name: "Secret Cult",
        visibility: "gm-only" as const,
      },
    ];

    const result = batchFilterPromotableFacts(facts, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("barrow");
  });

  it("filters out facts whose titles match existing vault entities case-insensitively and trimmed", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "inn",
        name: "  The Rusty Anchor  ",
      },
    ];

    const result = batchFilterPromotableFacts(facts, ["the rusty anchor"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("barrow");
  });

  it("filters out excluded / already processed IDs", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "tower",
        name: "The Spire",
      },
    ];

    const result = batchFilterPromotableFacts(facts, [], ["barrow"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tower");
  });

  it("deduplicates identical fact names within the same batch", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "barrow-dup",
        name: "the sunken barrow",
      },
    ];

    const result = batchFilterPromotableFacts(facts, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("barrow");
  });
});

describe("promoteProvisionalFacts", () => {
  const fact = (id: string, name: string, extra = {}) => ({
    ...playerVisibleFact,
    id,
    name,
    ...extra,
  });
  const deps = (over: Partial<FactPromotionDeps> = {}): FactPromotionDeps => {
    let next = 0;
    return {
      isCurrent: () => true,
      findExistingId: () => undefined,
      createEntity: vi.fn(async () => `rec-${++next}`),
      linkRecord: vi.fn(async () => {}),
      ...over,
    };
  };

  it("saves each fact and links it to its record, new or already saved", async () => {
    const d = deps({
      findExistingId: (title) => (title === "Mill" ? "rec-old" : undefined),
    });
    const result = await promoteProvisionalFacts(
      [fact("a", "Bridge"), fact("b", "Mill")],
      "Tale",
      d,
    );
    expect(result).toEqual({ added: 1, interrupted: false });
    expect(d.linkRecord).toHaveBeenNthCalledWith(1, expect.anything(), "rec-1");
    expect(d.linkRecord).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: "b" }),
      "rec-old",
    );
  });

  it("keeps going when linking changes the session, because currency is judged by isCurrent", async () => {
    let session = { id: "s1" };
    const d = deps({
      isCurrent: () => session.id === "s1",
      // Linking saves the adventure, which hands back a new session object.
      linkRecord: vi.fn(async () => {
        session = { ...session };
      }),
    });
    const result = await promoteProvisionalFacts(
      [fact("a", "Bridge"), fact("b", "Mill"), fact("c", "Tower")],
      "Tale",
      d,
    );
    expect(result).toEqual({ added: 3, interrupted: false });
  });

  it("stops and reports when the adventure changes mid-way", async () => {
    let current = true;
    const d = deps({
      isCurrent: () => current,
      linkRecord: vi.fn(async () => {
        current = false;
      }),
    });
    const result = await promoteProvisionalFacts(
      [fact("a", "Bridge"), fact("b", "Mill")],
      "Tale",
      d,
    );
    expect(result).toEqual({ added: 1, interrupted: true });
    expect(d.createEntity).toHaveBeenCalledTimes(1);
  });

  it("skips GM-only facts and reports each attempt", async () => {
    const attempts: string[] = [];
    const d = deps({ onAttempt: (f) => attempts.push(f.id) });
    const result = await promoteProvisionalFacts(
      [fact("a", "Secret", { visibility: "gm-only" }), fact("b", "Mill")],
      "Tale",
      d,
    );
    expect(result.added).toBe(1);
    expect(attempts).toEqual(["a", "b"]);
    expect(d.createEntity).toHaveBeenCalledTimes(1);
  });
});
