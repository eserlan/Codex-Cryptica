import { describe, expect, it } from "bun:test";
import {
  createSoloSession,
  parseSoloSession,
  nextVisitName,
  withCurrentSceneRenamed,
  withLastRoll,
  withParty,
  withScene,
  withSceneAdded,
  withTension,
} from "../src/session";

const valid = {
  version: 1,
  id: "s1",
  vaultId: "v1",
  startedAt: 1000,
  mapId: "m1",
  journalId: "j1",
  sceneName: "Arrival",
  sceneSectionId: "sec1",
  lastRoll: "d20",
};

describe("parseSoloSession", () => {
  it("round-trips a valid record, adding the Phase 2 defaults", () => {
    expect(parseSoloSession(valid, "v1")).toEqual({
      ...valid,
      partyIds: [],
      scenes: [{ name: "Arrival", sectionId: "sec1" }],
      tension: 5,
    });
  });

  it.each([
    ["wrong version", { ...valid, version: 2 }],
    ["empty id", { ...valid, id: "" }],
    ["vault mismatch", { ...valid, vaultId: "other" }],
    ["non-finite startedAt", { ...valid, startedAt: Number.NaN }],
    ["zero startedAt", { ...valid, startedAt: 0 }],
    ["scene over 80 chars", { ...valid, sceneName: "x".repeat(81) }],
    ["untrimmed scene", { ...valid, sceneName: " Arrival " }],
    ["roll over 64 chars", { ...valid, lastRoll: "1".repeat(65) }],
    ["map id wrong type", { ...valid, mapId: 42 }],
    ["journal id wrong type", { ...valid, journalId: true }],
    ["section id wrong type", { ...valid, sceneSectionId: 7 }],
  ])("returns null for %s", (_label, raw) => {
    expect(parseSoloSession(raw, "v1")).toBeNull();
  });

  it.each([[null], ["session"], [[1, 2]], [undefined]])(
    "returns null and never throws for %p",
    (raw) => {
      expect(() => parseSoloSession(raw, "v1")).not.toThrow();
      expect(parseSoloSession(raw, "v1")).toBeNull();
    },
  );
});

describe("createSoloSession", () => {
  const deps = {
    ids: { uuid: () => "generated-id" },
    clock: { now: () => 5000 },
  };

  it("uses injected id and clock and starts empty", () => {
    const session = createSoloSession(
      "v1",
      { mapId: "m1", journal: true },
      "j1",
      deps,
    );
    expect(session).toEqual({
      version: 1,
      id: "generated-id",
      vaultId: "v1",
      startedAt: 5000,
      mapId: "m1",
      journalId: "j1",
      sceneName: "",
      sceneSectionId: null,
      lastRoll: null,
      partyIds: [],
      scenes: [],
      tension: 5,
    });
  });

  it("stores a null journal when the journal option was off", () => {
    const session = createSoloSession(
      "v1",
      { mapId: null, journal: false },
      null,
      deps,
    );
    expect(session.journalId).toBeNull();
    expect(session.mapId).toBeNull();
  });
});

describe("withScene and withLastRoll", () => {
  const base = parseSoloSession(valid, "v1")!;

  it("withScene sets the trimmed name and section", () => {
    const next = withScene(base, "The crypt", "sec2");
    expect(next.sceneName).toBe("The crypt");
    expect(next.sceneSectionId).toBe("sec2");
    expect(base.sceneName).toBe("Arrival");
  });

  it("withLastRoll records the expression", () => {
    expect(withLastRoll(base, "2d6+1").lastRoll).toBe("2d6+1");
  });
});

describe("party (Solo Play Loop, FR-014 to FR-017)", () => {
  const base = parseSoloSession(valid, "v1")!;

  it("parses a Phase 1 record without partyIds as an empty party", () => {
    expect(parseSoloSession(valid, "v1")?.partyIds).toEqual([]);
  });

  it("accepts a party of up to 12 distinct ids", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    expect(
      parseSoloSession({ ...valid, partyIds: ids }, "v1")?.partyIds,
    ).toEqual(ids);
  });

  it("reads a party over 12, an empty id or a duplicate as no session", () => {
    const ids13 = Array.from({ length: 13 }, (_, i) => `c${i}`);
    expect(parseSoloSession({ ...valid, partyIds: ids13 }, "v1")).toBeNull();
    expect(parseSoloSession({ ...valid, partyIds: [""] }, "v1")).toBeNull();
    expect(
      parseSoloSession({ ...valid, partyIds: ["a", "a"] }, "v1"),
    ).toBeNull();
  });

  it("withParty sets the party, removing duplicates", () => {
    expect(withParty(base, ["a", "b", "a"]).partyIds).toEqual(["a", "b"]);
  });

  it("withParty keeps at most 12 members", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `c${i}`);
    expect(withParty(base, ids).partyIds).toHaveLength(12);
  });
});

describe("scenes (Solo Play Loop, FR-022 to FR-024)", () => {
  const base = parseSoloSession(valid, "v1")!;
  const scene = (name: string, sectionId: string | null = null) => ({
    name,
    sectionId,
  });

  it("parses a Phase 1 record as one scene built from its current scene", () => {
    expect(parseSoloSession(valid, "v1")?.scenes).toEqual([
      scene("Arrival", "sec1"),
    ]);
  });

  it("parses an empty list when a record has no scene", () => {
    const noScene = { ...valid, sceneName: "", sceneSectionId: null };
    expect(parseSoloSession(noScene, "v1")?.scenes).toEqual([]);
  });

  it("accepts up to 100 scenes and reads more as no session", () => {
    const many = Array.from({ length: 100 }, (_, i) => scene(`s${i}`));
    expect(
      parseSoloSession({ ...valid, scenes: many }, "v1")?.scenes,
    ).toHaveLength(100);
    const over = Array.from({ length: 101 }, (_, i) => scene(`s${i}`));
    expect(parseSoloSession({ ...valid, scenes: over }, "v1")).toBeNull();
  });

  it("reads a scene name over 80 characters, or a malformed scene, as no session", () => {
    expect(
      parseSoloSession({ ...valid, scenes: [scene("x".repeat(81))] }, "v1"),
    ).toBeNull();
    expect(
      parseSoloSession(
        { ...valid, scenes: [{ name: 3, sectionId: null }] },
        "v1",
      ),
    ).toBeNull();
  });

  it("withSceneAdded appends a scene and makes it current", () => {
    const next = withSceneAdded(base, "The crypt", "sec2");
    expect(next.scenes.map((s) => s.name)).toEqual(["Arrival", "The crypt"]);
    expect(next.sceneName).toBe("The crypt");
    expect(next.sceneSectionId).toBe("sec2");
  });

  it("withCurrentSceneRenamed renames the current, last, scene", () => {
    const next = withCurrentSceneRenamed(
      withSceneAdded(base, "The crypt", "sec2"),
      "The tomb",
    );
    expect(next.scenes.map((s) => s.name)).toEqual(["Arrival", "The tomb"]);
  });

  it("nextVisitName numbers repeat visits, and an out-of-range index gives null", () => {
    const scenes = [scene("Arrival"), scene("Crypt")];
    expect(nextVisitName(scenes, 0)).toBe("Arrival (2)");
    const withVisit = [...scenes, scene("Arrival (2)")];
    expect(nextVisitName(withVisit, 0)).toBe("Arrival (3)");
    expect(nextVisitName(withVisit, 2)).toBe("Arrival (3)");
    expect(nextVisitName(scenes, 9)).toBeNull();
  });

  it("keeps a visit name within the scene name limit, even for a name at the limit", () => {
    const longName = "A".repeat(80);
    const scenes = [scene(longName)];
    const visit = nextVisitName(scenes, 0);
    expect(visit).not.toBeNull();
    expect(visit!.length).toBeLessThanOrEqual(80);
    expect(visit!.endsWith(" (2)")).toBe(true);
    // A stored record with the visit is still valid, so returning to it works.
    const stored = {
      ...valid,
      sceneName: visit,
      sceneSectionId: "sec2",
      scenes: [
        { name: longName, sectionId: "sec1" },
        { name: visit, sectionId: "sec2" },
      ],
    };
    expect(parseSoloSession(stored, "v1")).not.toBeNull();
    const again = nextVisitName([...scenes, scene(visit!)], 0);
    expect(again!.length).toBeLessThanOrEqual(80);
    expect(again!.endsWith(" (3)")).toBe(true);
  });
});

describe("tension (spec 174, FR-010)", () => {
  it("rejects a tension that is not an integer from 1 to 9", () => {
    for (const bad of [0, 10, 4.5, "5"]) {
      expect(parseSoloSession({ ...valid, tension: bad }, "v1")).toBeNull();
    }
  });

  it("clamps withTension to the 1 to 9 scale", () => {
    const session = parseSoloSession(valid, "v1")!;
    expect(withTension(session, 12).tension).toBe(9);
    expect(withTension(session, -3).tension).toBe(1);
    expect(withTension(session, 7).tension).toBe(7);
  });
});
