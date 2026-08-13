import { describe, expect, it } from "vitest";
import { factionConfig } from "./public-faction-constants";
import { BANNED_NAMES } from "./public-npc-constants";
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
    "factionObstacles",
    "loreFinds",
    "roomEncounters",
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
        factionObstacles: 8,
        loreFinds: 5,
        roomEncounters: 5,
        // Secrets and treasures are drawn once per dungeon and never dedup'd
        // against anything, so the pool size alone decides how often a GM sees
        // a repeat. Held higher than the per-sector pools for that reason.
        secrets: 8,
        hazards: 5,
        treasures: 8,
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

  it("keeps room encounters distinct from hazards", () => {
    // The Monster bucket should hold something that acts; the Trap bucket holds
    // environmental danger. Writing a hazard into roomEncounters puts the same
    // idea in two sectors of one dungeon under different labels.
    const significant = (s: string) =>
      new Set(
        s
          .toLowerCase()
          .replace(/[^a-z\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      for (const encounter of tables.roomEncounters) {
        const a = significant(encounter);
        for (const hazard of tables.hazards) {
          const b = significant(hazard);
          const shared = [...a].filter((w) => b.has(w)).length;
          const overlap = shared / Math.min(a.size, b.size);
          expect(
            overlap,
            `${label}: room encounter restates a hazard\n  ${encounter}\n  ${hazard}`,
          ).toBeLessThan(0.6);
        }
      }
    }
  });

  it("gives the optimistic setting explicit tonal direction", () => {
    // Since the model authors hazards itself, the deliberately non-malicious
    // tone of this genre's tables never reaches it — the hint is the only
    // signal. Without tone in the hint the default prior wins, and a hopeful
    // exploration setting came back as "The Cyanide Bastion" with acid traps.
    const hint = DUNGEON_GENRE_TABLES["Optimistic Exploration Sci-Fi"].hint;
    expect(hint).toMatch(/tone/i);
    expect(hint).toMatch(/hopeful/i);
    expect(hint).toMatch(
      /never toxicity|not built to harm|nothing here was built to harm/i,
    );
  });

  it("uses no banned cliché names in any name-bearing field", () => {
    // Name fields only — descriptions legitimately contain "stone", "ash", etc.
    const offenders: string[] = [];
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      const named = [
        ...tables.sampleTitles,
        ...tables.sectors.map((s) => s.name),
        ...tables.factionNames,
      ];
      for (const value of named) {
        for (const banned of BANNED_NAMES) {
          if (new RegExp(`\\b${banned}\\b`).test(value)) {
            offenders.push(`${label}: "${banned}" in "${value}"`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses no faction obstacle that presumes a map the layout never fixes", () => {
    // "the only other stair" asserts a second stair exists. The layout is a
    // pointcrawl of sectors and never establishes how many stairs there are, so
    // a delve whose prose says there is one way in contradicts its own obstacle.
    // "the only X" is fine — that is a singular claim, not a count.
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      for (const obstacle of tables.factionObstacles) {
        expect(obstacle, `${label} presumes a second one exists`).not.toMatch(
          /\bonly other\b/i,
        );
      }
    }
  });

  it("uses no faction obstacle that introduces an unestablished mystery entity", () => {
    // "something far older that watches" or "a debt owed to a power outside
    // these walls" hand the AI a ready-made supernatural threat as an
    // "obstacle seed" — the model then keeps it (paraphrased), producing a
    // faction obstacle that references a watcher/curse/power nothing else in
    // the dungeon ever establishes. Obstacles must stay grounded: a shortage,
    // an injury, a rival, a deadline, a debt to a named, mundane party.
    const UNGROUNDED_MYSTERY =
      /\bsomething (far older|beneath|lurking|unseen)\b|\ba power (outside|beyond)\b|\ba (curse|guardian|watcher|entity|presence) (that|which)?\s*(watches|stirs|lurks|waits)\b|\ba (vow|bargain) made to a thing\b/i;
    for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
      for (const obstacle of tables.factionObstacles) {
        expect(obstacle, `${label}: "${obstacle}"`).not.toMatch(
          UNGROUNDED_MYSTERY,
        );
      }
    }
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
