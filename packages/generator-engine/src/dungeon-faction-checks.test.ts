import { describe, expect, it } from "vitest";
import { checkFactions } from "./dungeon-faction-checks";
import {
  foundation,
  sectors,
  factions,
  setup,
} from "./dungeon-staged.test-fixtures";
import type { DungeonJson } from "./public-dungeon";

describe("faction stage checks", () => {
  it("accepts grounded factions and warns when held sectors lack presence", () => {
    const resolved = setup();
    const data = factions(resolved);
    const secs = sectors(resolved).sectors as DungeonJson["sectors"];
    const inventory = { ...foundation(resolved), ...sectors(resolved) };
    expect(checkFactions(data, resolved, secs, inventory)).toEqual({
      hard: [],
      soft: [],
    });
    data.factions[0].presence = [];
    expect(checkFactions(data, resolved, secs, inventory).soft).toEqual([
      "Lantern Wrights holds sector-1 but its presence says nothing about what it has done there",
    ]);
  });

  it("rejects invalid faction shapes before running soft checks", () => {
    const resolved = setup();
    const data = factions(resolved);
    const secs = sectors(resolved).sectors as DungeonJson["sectors"];
    const inventory = { ...foundation(resolved), ...sectors(resolved) };
    expect(checkFactions({}, resolved, secs, inventory)).toEqual({
      hard: ["factionSituation is missing", "expected 2 factions, got 0"],
      soft: [],
    });
    data.factions[0].identity = "";
    data.factions[0].leader.name = "";
    data.factions[0].territorySectorIds = [];
    data.factions[0].name = "Faction A";
    const checked = checkFactions(data, resolved, secs, inventory);
    expect(checked.hard).toEqual([
      "Faction A is missing: identity, leader",
      "Faction A has no territorySectorIds",
      "Faction A uses a placeholder name",
    ]);
    expect(checked.soft).toEqual([]);
  });
});
