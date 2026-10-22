import { describe, expect, it } from "vitest";
import {
  assembleDungeon,
  foundationFactsOf,
  geographyFactsOf,
} from "./dungeon-stage-assembly";
import {
  foundation,
  sectors,
  factions,
  setup,
} from "./dungeon-staged.test-fixtures";
import type { DungeonJson } from "./public-dungeon";

describe("dungeon stage assembly", () => {
  it("keeps fixed ids, stock types and drives and moves only held presence", () => {
    const resolved = setup();
    const f = foundation(resolved);
    const facts = foundationFactsOf(f);
    const geo = sectors(resolved);
    const raw = factions(resolved);
    raw.factions[0].presence.push(
      { sectorId: "sector-1", detail: "Duplicate camp." },
      { sectorId: "sector-3", detail: "Not held." },
    );
    // Reply order is irrelevant to assembly: fixed ids determine order and stock types.
    geo.sectors.reverse();
    const geography = geographyFactsOf(resolved, facts, geo);
    const result = assembleDungeon(resolved, {
      foundation: f,
      facts,
      geography,
      factions: raw,
    });
    const secs = result.sectors as DungeonJson["sectors"];
    expect(secs.map((s) => s.id)).toEqual(resolved.sectors.map((s) => s.id));
    expect(secs.map((s) => s.stockType)).toEqual(
      resolved.sectors.map((s) => s.stockType),
    );
    expect(secs[0].presence).toEqual([
      {
        faction: "Lantern Wrights",
        detail: "Lantern Wrights camp in sector-1.",
      },
    ]);
    expect(secs[2].presence).toBeUndefined();
    expect(result.factions).toEqual(
      raw.factions.map(({ presence: _presence, ...rest }, i) => ({
        ...rest,
        drive: resolved.factions[i].drive,
      })),
    );
    expect(result.summary).toBe(f.summary);
    expect(result.throughline).toBe(f.throughline);
    expect(geography.sectors[0].presence).toBeUndefined();
    expect(raw.factions[0].presence).toHaveLength(3);
  });

  it("normalises missing and fragmented fields without inventing facts", () => {
    const resolved = setup();
    resolved.factions = [];
    const facts = foundationFactsOf({
      title: [" A", "delve "],
      sectorBriefs: [null, { id: " sector-1 ", brief: [" A", "room "] }],
    });
    expect(facts.title).toBe("A delve");
    expect(facts.sectorBriefs).toEqual([
      { id: "", brief: "" },
      { id: "sector-1", brief: "A room" },
    ]);
    const geography = geographyFactsOf(resolved, facts, {});
    const result = assembleDungeon(resolved, {
      foundation: {},
      facts,
      geography,
      factions: { factions: [{ name: "Crew", drive: [" Keep", "watch "] }] },
    });
    expect(geography.sectors[0]).toEqual({
      id: "sector-1",
      name: "",
      description: "",
      stockType: resolved.sectors[0].stockType,
      stockDetail: "",
    });
    expect(geography.hazards).toEqual([]);
    expect(result.factions).toEqual([{ name: "Crew", drive: "Keep watch" }]);
    expect(result.summary).toBe("");
    expect(result.factionSituation).toBe("");
  });
});
