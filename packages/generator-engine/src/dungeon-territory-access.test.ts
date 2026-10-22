import { describe, expect, it } from "vitest";
import { checkTerritoryAccess } from "./dungeon-territory-access";

describe("checkTerritoryAccess", () => {
  const SECTORS = ["A", "B", "C", "D"].map((name, i) => ({
    id: `sector-${i + 1}`,
    name: `${name} Hall`,
  }));
  const CHAIN = [0, 1, 2].map((i) => ({
    from: i,
    to: i + 1,
    via: "the main passage",
  }));
  const holder = (territory: string[], text = "Strong walls.") => ({
    name: "Custodians",
    goal: "Keep the records.",
    obstacle: "Few hands.",
    relationship: "Wary.",
    strength: text,
    origin: "",
    belief: "",
    territorySectorIds: territory,
  });

  it("flags territory split by a sector it does not hold", () => {
    const issues = checkTerritoryAccess(
      [holder(["sector-1", "sector-3"])],
      SECTORS,
      CHAIN,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("only connect through B Hall;");
    expect(issues[0]).not.toContain("D Hall");
  });

  it.each([
    ["Tunnel-fighting veterans."],
    ["Supplies run low and morale is cut off from hope."],
    ["They plan to cross swords with the Choir."],
    ["They pass the time cataloguing bones."],
  ])(
    "still flags a split territory when the text only seems to explain it: %s",
    (strength) => {
      expect(
        checkTerritoryAccess(
          [holder(["sector-1", "sector-3"], strength)],
          SECTORS,
          CHAIN,
        ),
      ).toHaveLength(1);
    },
  );

  it.each([
    ["A truce lets them pass the B Hall."],
    ["They smuggle supplies past the Choir: by night, in sacks."],
    ["The archive is an isolated enclave behind Choir lines."],
    ["They bribe the guards of b hall for each crossing."],
    ["Runners use a secret passage under the floor."],
  ])("accepts a split territory whose text says how: %s", (strength) => {
    expect(
      checkTerritoryAccess(
        [holder(["sector-1", "sector-3"], strength)],
        SECTORS,
        CHAIN,
      ),
    ).toEqual([]);
  });

  it("accepts connected territory, a shortcut, or text that says how it crosses", () => {
    expect(
      checkTerritoryAccess([holder(["sector-1", "sector-2"])], SECTORS, CHAIN),
    ).toEqual([]);
    expect(
      checkTerritoryAccess([holder(["sector-1", "sector-4"])], SECTORS, [
        ...CHAIN,
        { from: 0, to: 3, via: "a collapsed shaft" },
      ]),
    ).toEqual([]);
    expect(
      checkTerritoryAccess(
        [
          holder(
            ["sector-1", "sector-3"],
            "A truce lets them pass the B Hall.",
          ),
        ],
        SECTORS,
        CHAIN,
      ),
    ).toEqual([]);
  });
});
