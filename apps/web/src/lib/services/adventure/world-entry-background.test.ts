import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  parseAdventureSession,
  type AdventureSession,
} from "@codex/adventure-engine";
import { seedWorldEntryBackground } from "./world-entry-background";

function session(): AdventureSession {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "local-session-123",
    vaultId: "vault-1",
    title: "Lira in Northbrook",
    status: "active",
    createdAt: "2026-11-02T12:00:00Z",
    updatedAt: "2026-11-02T12:00:00Z",
    lastPlayedAt: "2026-11-02T12:00:00Z",
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Lira",
      description: "Rider",
    },
    premise: "Explore Northbrook",
    sourceRecords: [],
    worldEntry: {
      version: 1,
      location: { kind: "provisional", name: "Northbrook" },
      intent: "explore",
    },
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
  });
}

describe("world entry background situations", () => {
  it("seeds hidden, paired rumours without revealing them", () => {
    let nextId = 0;
    const seeded = seedWorldEntryBackground(session(), () =>
      `seed-${++nextId}`,
    );
    expect(seeded.hiddenState.secrets).toHaveLength(3);
    expect(seeded.hiddenState.gmThreads).toHaveLength(3);
    expect(
      seeded.hiddenState.secrets.every((fact) => fact.status === "hidden"),
    ).toBe(true);
    expect(
      seeded.hiddenState.gmThreads.every((thread) => thread.status === "hidden"),
    ).toBe(true);
    expect(seeded.hiddenState.secrets.map((item) => item.text)).toEqual([
      expect.stringContaining("essentially true"),
      expect.stringContaining("exaggeration"),
      expect.stringContaining("dangerous misconception"),
    ]);
    expect(seeded.hiddenState.gmThreads[0]?.text).toContain("NOT YET HEARD");
    expect(seeded.visibleState.knownFacts).toEqual([]);
    expect(seeded.scenarioState).toBeUndefined();
    expect(parseAdventureSession(seeded)).toEqual(seeded);
    const prompt = buildAdventurePrompt({
      session: seeded,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(prompt.state).toContain("NOT YET HEARD");
    expect(prompt.behavior).toContain("reveal at most one");
  });

  it("seeds older World Entry sessions on their next action", () => {
    const older = session();
    older.turns = [{ id: "older-turn" } as AdventureSession["turns"][number]];
    const seeded = seedWorldEntryBackground(older, () => "new-id");
    expect(seeded.hiddenState.gmThreads).toHaveLength(3);
  });

  it("produces stable seeds and never reseeds a persisted session", () => {
    let index = 0;
    const first = seedWorldEntryBackground(session(), () => `id-${++index}`);
    index = 0;
    const second = seedWorldEntryBackground(session(), () => `id-${++index}`);
    expect(first.hiddenState).toEqual(second.hiddenState);
    expect(seedWorldEntryBackground(first, () => "unexpected")).toBe(first);
  });

  it("preserves pre-existing GM state and ordinary adventures", () => {
    const ordinary = session();
    delete ordinary.worldEntry;
    expect(seedWorldEntryBackground(ordinary, () => "id")).toBe(ordinary);
    const alreadyPrepared = session();
    alreadyPrepared.hiddenState.gmThreads.push({
      id: "existing",
      text: "An existing hidden GM thread",
      status: "hidden",
    });
    expect(seedWorldEntryBackground(alreadyPrepared, () => "id")).toBe(
      alreadyPrepared,
    );
  });
});
