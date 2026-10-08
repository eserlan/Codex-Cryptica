import { describe, expect, it } from "bun:test";
import {
  createSoloSession,
  parseSoloSession,
  withLastRoll,
  withScene,
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
  it("round-trips a valid record", () => {
    expect(parseSoloSession(valid, "v1")).toEqual(valid);
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
