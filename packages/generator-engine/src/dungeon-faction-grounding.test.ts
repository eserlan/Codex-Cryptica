import { describe, expect, it } from "vitest";
import { checkFactionGrounding } from "./dungeon-faction-grounding";
import {
  faction,
  foundation,
  sectors,
  setup,
} from "./dungeon-staged.test-fixtures";
import type { DungeonJson } from "./public-dungeon";

describe("faction inventory grounding", () => {
  it("accepts established places and reports invented places and sector ids once", () => {
    const resolved = setup();
    const dungeon = { ...foundation(resolved), ...sectors(resolved) };
    const inventory = {
      ...dungeon,
      sectors: dungeon.sectors as DungeonJson["sectors"],
    };
    const f = { ...faction("Custodians", ["sector-1"]), presence: undefined };
    expect(
      checkFactionGrounding([f], "The furnace is contested.", inventory),
    ).toEqual([]);
    f.goal = "Enter sector-99, then sector-99 and the Obsidian Vault";
    const issues = checkFactionGrounding([f], "Wait in sector-88", inventory);
    expect(issues).toHaveLength(3);
    expect(issues.join()).toContain('names "Obsidian Vault"');
    expect(issues).toContain(
      "factionSituation refers to sector-88, which does not exist",
    );
    inventory.secret = "The Obsidian Vault hides the furnace.";
    expect(checkFactionGrounding([f], "", inventory).join()).not.toContain(
      "not established",
    );
  });
});
