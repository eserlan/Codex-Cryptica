import { describe, expect, it } from "vitest";
import { factionConfig } from "./public-faction-constants";
import {
  DUNGEON_GENRE_TABLES,
  ORIGINAL_USE_BY_PURPOSE,
  CONDITION_BY_STATE,
  dungeonConfig,
  forGenre,
  type DungeonGenreTables,
} from "./public-dungeon-constants";

/**
 * The dungeon generator silently falls back to Fantasy for any theme without
 * its own tables. That is how seven selectable themes ended up generating
 * dwarven dynasties. These tests make that failure loud instead.
 */
describe("dungeon genre coverage", () => {
  const themes = factionConfig.themes;

  it("has dedicated tables for every theme the selector offers", () => {
    const missing = themes.filter(
      (t) =>
        !(t in DUNGEON_GENRE_TABLES) &&
        !(t.replace(/^Classic /, "") in DUNGEON_GENRE_TABLES),
    );
    expect(missing).toEqual([]);
  });

  const FIELDS: Array<keyof DungeonGenreTables> = [
    "sampleTitles",
    "builders",
    "originalUses",
    "entrances",
    "compositions",
    "conditions",
    "causes",
    "sectors",
    "inhabitants",
    "factionNames",
    "secrets",
    "hazards",
    "treasures",
    "hooks",
    "signatureFeatures",
    "purposes",
    "currentStates",
  ];

  it.each(themes)(
    "resolves %s to its own tables, not the Fantasy default",
    (theme) => {
      const own =
        DUNGEON_GENRE_TABLES[theme] ??
        DUNGEON_GENRE_TABLES[theme.replace(/^Classic /, "")];
      expect(own).toBeDefined();
      for (const field of FIELDS) {
        const resolved = forGenre(
          Object.fromEntries(
            Object.entries(DUNGEON_GENRE_TABLES).map(([k, v]) => [k, v[field]]),
          ) as Record<string, unknown[]>,
          theme,
        );
        expect(resolved).toBe(own[field]);
      }
    },
  );

  it.each(Object.entries(DUNGEON_GENRE_TABLES))(
    "%s has enough entries in every table to avoid constant repeats",
    (_label, tables) => {
      const MINIMUMS: Partial<Record<keyof DungeonGenreTables, number>> = {
        sampleTitles: 5,
        builders: 5,
        originalUses: 4,
        entrances: 5,
        compositions: 5,
        conditions: 5,
        causes: 5,
        sectors: 6,
        inhabitants: 5,
        factionNames: 10,
        secrets: 5,
        hazards: 5,
        treasures: 5,
        hooks: 5,
        signatureFeatures: 5,
        purposes: 5,
        currentStates: 5,
      };
      for (const [field, min] of Object.entries(MINIMUMS)) {
        const value = tables[field as keyof DungeonGenreTables] as unknown[];
        expect(value.length).toBeGreaterThanOrEqual(min as number);
      }
      expect(tables.hint.length).toBeGreaterThan(20);
    },
  );

  it("has no duplicate entries within any single table", () => {
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      for (const field of FIELDS) {
        const values = tables[field] as unknown[];
        const keys = values.map((v) =>
          typeof v === "string" ? v : JSON.stringify(v),
        );
        expect(
          new Set(keys).size,
          `${label}.${String(field)} has duplicates`,
        ).toBe(keys.length);
      }
    }
  });

  it("covers every purpose in the union with an ORIGINAL_USE_BY_PURPOSE entry", () => {
    const uncovered = dungeonConfig.purposes.filter(
      (p) => !ORIGINAL_USE_BY_PURPOSE[p],
    );
    expect(uncovered).toEqual([]);
  });

  it("covers every current state in the union with a CONDITION_BY_STATE entry", () => {
    const uncovered = dungeonConfig.currentStates.filter(
      (s) => !CONDITION_BY_STATE[s],
    );
    expect(uncovered).toEqual([]);
  });

  it("only overrides purposes the genre actually offers", () => {
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      for (const purpose of Object.keys(tables.originalUsesByPurpose ?? {})) {
        expect(tables.purposes, `${label} overrides unused purpose`).toContain(
          purpose,
        );
      }
    }
  });

  it("only lists purposes and states that exist in the shared unions", () => {
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      for (const p of tables.purposes) {
        expect(dungeonConfig.purposes, `${label} purpose`).toContain(p);
      }
      for (const s of tables.currentStates) {
        expect(dungeonConfig.currentStates, `${label} state`).toContain(s);
      }
    }
  });
});
