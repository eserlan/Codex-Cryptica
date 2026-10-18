import { describe, expect, it } from "bun:test";
import {
  planDiscoverySave,
  appendToAiNotes,
  matchFaction,
  planFactionSave,
} from "../src/discovery/save";
import {
  DISCOVERY_PART_IDS,
  settleDraft,
  type HexDiscoveryDraft,
  type DiscoveryPartId,
} from "../src/discovery/draft";
import {
  NOTES_MAX_LENGTH,
  upsertHexRecord,
  type HexRecord,
} from "../src/model";

const part = (
  text: string,
  status: "pending" | "saved" | "discarded" = "pending",
  source: "ai" | "tables" = "ai",
) => ({
  text,
  status,
  source,
});

const draftOf = (
  overrides: Partial<Record<DiscoveryPartId, ReturnType<typeof part>>> = {},
  source: "ai" | "tables" = "ai",
): HexDiscoveryDraft => ({
  source,
  createdAt: 1,
  parts: {
    landmark: part("Old Mill\nA ruined mill by the ford.", "pending", source),
    encounter: part("Wolves\nA pack shadows the road.", "pending", source),
    hazard: part("Loose scree.", "pending", source),
    secret: part("A smuggler's cache.", "pending", source),
    factionPresence: part("Guild wardens patrol.", "pending", source),
    atmosphere: part("Damp air.", "pending", source),
    ...overrides,
  },
});

const noLink = { entityId: "loc-1" };

describe("planDiscoverySave (T059)", () => {
  it("landmark becomes a location with the hex labels and a proposed link when ticked", () => {
    const result = planDiscoverySave({
      draft: draftOf(),
      part: "landmark",
      proposedLink: noLink,
      linkTicked: true,
    });
    expect(result.entity).toEqual({
      type: "location",
      title: "Old Mill",
      content: "A ruined mill by the ford.",
      status: "draft",
      labels: ["hex-crawl-discovery", "ai-drafted"],
    });
    expect(result.link).toEqual({ toEntityId: "loc-1", type: "related_to" });
    expect(result.draft.parts.landmark.status).toBe("saved");
  });

  it("encounter is an event by default and a note when chosen", () => {
    const event = planDiscoverySave({
      draft: draftOf(),
      part: "encounter",
      proposedLink: null,
      linkTicked: false,
    });
    expect(event.entity.type).toBe("event");
    const note = planDiscoverySave({
      draft: draftOf(),
      part: "encounter",
      encounterType: "note",
      proposedLink: null,
      linkTicked: false,
    });
    expect(note.entity.type).toBe("note");
  });

  it("labels table-sourced parts as rolled", () => {
    const result = planDiscoverySave({
      draft: draftOf({}, "tables"),
      part: "landmark",
      proposedLink: null,
      linkTicked: false,
    });
    expect(result.entity.labels).toEqual(["hex-crawl-discovery", "rolled"]);
  });

  it("creates no link when the proposed link is not ticked", () => {
    const result = planDiscoverySave({
      draft: draftOf(),
      part: "landmark",
      proposedLink: noLink,
      linkTicked: false,
    });
    expect(result.link).toBeNull();
  });

  it("negative: refuses a part that is not pending", () => {
    const saved = draftOf({ landmark: part("Old Mill\nText.", "saved") });
    expect(() =>
      planDiscoverySave({
        draft: saved,
        part: "landmark",
        proposedLink: null,
        linkTicked: false,
      }),
    ).toThrow();
  });
});

describe("appendToAiNotes (T059)", () => {
  it("appends a hazard to aiNotes and marks it saved", () => {
    const result = appendToAiNotes(undefined, "hazard", draftOf(), 5);
    expect(result.patch.aiNotes).toContain("Loose scree.");
    expect(result.patch.draft?.parts.hazard.status).toBe("saved");
    expect(result.patch.updatedAt).toBe(5);
  });

  it("keeps existing aiNotes and adds to them", () => {
    const result = appendToAiNotes(
      { aiNotes: "Earlier.", updatedAt: 1 },
      "secret",
      draftOf(),
      5,
    );
    expect(result.patch.aiNotes?.startsWith("Earlier.")).toBe(true);
    expect(result.patch.aiNotes).toContain("A smuggler's cache.");
  });

  it("negative: a landmark is not an aiNotes part", () => {
    expect(() =>
      appendToAiNotes(undefined, "landmark" as "hazard", draftOf(), 5),
    ).toThrow();
  });

  it("negative: preserves full AI notes and leaves the part pending", () => {
    const existing = "x".repeat(NOTES_MAX_LENGTH);
    expect(() =>
      appendToAiNotes(
        { aiNotes: existing, updatedAt: 1 },
        "hazard",
        draftOf(),
        5,
      ),
    ).toThrow(/AI notes are full/);
    expect(existing).toHaveLength(NOTES_MAX_LENGTH);
    expect(draftOf().parts.hazard.status).toBe("pending");
  });

  it("property: the patch never contains notes, across random records", () => {
    let seed = 1;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 200; i++) {
      const record: HexRecord = {
        updatedAt: 1,
        notes: rand() > 0.5 ? "GM text" : undefined,
        aiNotes: rand() > 0.5 ? "AI text" : undefined,
        explored: rand() > 0.5,
      };
      const partId = (["hazard", "secret", "atmosphere"] as const)[i % 3];
      const { patch } = appendToAiNotes(record, partId, draftOf(), 9);
      expect("notes" in patch).toBe(false);
      expect(Object.keys(patch).sort()).toEqual([
        "aiNotes",
        "draft",
        "updatedAt",
      ]);
    }
  });

  it("never changes GM notes when applied to a real record", () => {
    const state = upsertHexRecord(
      { enabled: true, hexes: {} },
      { q: 0, r: 0 },
      { notes: "My secret plan." },
      1,
    );
    const record = state.hexes["0,0"];
    const { patch } = appendToAiNotes(record, "hazard", draftOf(), 2);
    const next = upsertHexRecord(state, { q: 0, r: 0 }, patch, 2);
    expect(next.hexes["0,0"].notes).toBe("My secret plan.");
  });
});

describe("matchFaction (T059)", () => {
  const factions = [{ id: "f1", title: "Iron Guild" }];

  it("matches case-insensitively and exactly", () => {
    expect(matchFaction("iron guild", factions)).toEqual({ id: "f1" });
    expect(matchFaction("  IRON GUILD ", factions)).toEqual({ id: "f1" });
  });

  it("returns null for a partial match", () => {
    expect(matchFaction("Iron", factions)).toBeNull();
    expect(matchFaction("Guild", factions)).toBeNull();
  });
});

describe("planFactionSave (T059, FR-025)", () => {
  it("links every already-saved entity of this hex to the faction", () => {
    const result = planFactionSave({
      draft: draftOf(),
      factionId: "f1",
      factionTitle: "Iron Guild",
      savedEntityIds: ["e1", "e2"],
      record: undefined,
      now: 3,
    });
    expect(result.links).toEqual([
      { fromEntityId: "e1", toEntityId: "f1", type: "related_to" },
      { fromEntityId: "e2", toEntityId: "f1", type: "related_to" },
    ]);
  });

  it("with no saved entities, returns no links but still adds the aiNotes line", () => {
    const result = planFactionSave({
      draft: draftOf(),
      factionId: "f1",
      factionTitle: "Iron Guild",
      savedEntityIds: [],
      record: undefined,
      now: 3,
    });
    expect(result.links).toEqual([]);
    expect(result.patch.aiNotes).toContain("Faction presence: Iron Guild");
  });

  it("the patch never contains notes", () => {
    const result = planFactionSave({
      draft: draftOf(),
      factionId: "f1",
      factionTitle: "Iron Guild",
      savedEntityIds: ["e1"],
      record: { updatedAt: 1, notes: "GM only" },
      now: 3,
    });
    expect("notes" in result.patch).toBe(false);
  });

  it("the draft remembers the faction id, and the part is saved", () => {
    const result = planFactionSave({
      draft: draftOf(),
      factionId: "f1",
      factionTitle: "Iron Guild",
      savedEntityIds: [],
      record: undefined,
      now: 3,
    });
    expect(result.draft.parts.factionPresence.status).toBe("saved");
    expect(result.draft.parts.factionPresence.factionId).toBe("f1");
  });

  it("negative: refuses a faction part that is not pending", () => {
    const saved = draftOf({ factionPresence: part("x", "saved") });
    expect(() =>
      planFactionSave({
        draft: saved,
        factionId: "f1",
        factionTitle: "Iron Guild",
        savedEntityIds: [],
        record: undefined,
        now: 3,
      }),
    ).toThrow();
  });

  it("negative: refuses a faction note that will not fit without settling its part", () => {
    const draft = draftOf();
    expect(() =>
      planFactionSave({
        draft,
        factionId: "f1",
        factionTitle: "Iron Guild",
        savedEntityIds: [],
        record: { aiNotes: "x".repeat(NOTES_MAX_LENGTH), updatedAt: 1 },
        now: 3,
      }),
    ).toThrow(/AI notes are full/);
    expect(draft.parts.factionPresence.status).toBe("pending");
  });
});

describe("draft lifecycle (T059)", () => {
  it("the draft is removed once no part is pending", () => {
    let draft = draftOf();
    for (const id of DISCOVERY_PART_IDS) {
      draft = {
        ...draft,
        parts: {
          ...draft.parts,
          [id]: { ...draft.parts[id], status: "discarded" },
        },
      };
    }
    expect(settleDraft(draft)).toBeUndefined();
  });

  it("the draft is kept while a part is still pending", () => {
    const draft = draftOf({ landmark: part("Done", "saved") });
    expect(settleDraft(draft)).toBe(draft);
  });
});
