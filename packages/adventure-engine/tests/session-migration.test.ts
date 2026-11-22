import { describe, expect, it } from "vitest";
import { migrateAdventureSession } from "../src/session-migration";
import { session } from "./reducer-fixtures";
import { anchorSession } from "./historical-anchor-fixtures";

describe("session migration", () => {
  it("upgrades legacy versions without mutating their records", () => {
    const input = {
      ...session(),
      schemaVersion: 1,
      dicePresets: undefined,
      resourceCounters: undefined,
    };
    const before = structuredClone(input);
    const migrated = migrateAdventureSession(input);
    expect(migrated).toMatchObject({
      schemaVersion: 3,
      dicePresets: [],
      resourceCounters: [],
    });
    expect(input).toEqual(before);
    expect(migrated).not.toBe(input);
  });

  it("retains current sessions and migrates historical anchors independently", () => {
    const input = anchorSession();
    expect(migrateAdventureSession(input)).toEqual(input);
    const futureAnchor = { ...input.historicalAnchor, version: 2 };
    expect(() =>
      migrateAdventureSession({ ...input, historicalAnchor: futureAnchor }),
    ).toThrow("incompatible-version");
    expect(futureAnchor.version).toBe(2);
  });

  it.each([{ input: null }, { input: [] }, { input: "session" }, { input: 1 }])(
    "rejects non-document input $input",
    ({ input }) => {
      expect(() => migrateAdventureSession(input)).toThrow(
        "invalid-adventure-session",
      );
    },
  );

  it.each([undefined, "3", 0, -1, 1.5, NaN])(
    "rejects invalid version %s",
    (schemaVersion) => {
      expect(() => migrateAdventureSession({ schemaVersion })).toThrow(
        "invalid-adventure-session-version",
      );
    },
  );

  it("rejects future and mixed legacy representations", () => {
    expect(() => migrateAdventureSession({ schemaVersion: 4 })).toThrow(
      "incompatible-version",
    );
    expect(() =>
      migrateAdventureSession({
        ...session(),
        schemaVersion: 2,
        scenarioState: {},
        scenarioCollection: {},
      }),
    ).toThrow("mixed-scenario-representations");
  });
});
