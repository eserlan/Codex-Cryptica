import { describe, expect, it } from "vitest";
import { whichTabletopRpgsHaveSquadAndMassBattleRules } from "./pages/which-tabletop-rpgs-have-squad-and-mass-battle-rules";

describe("squad and mass-battle answer rules", () => {
  it("uses current Pathfinder troop and Savage Worlds mass-battle rules", () => {
    const answerText = JSON.stringify(
      whichTabletopRpgsHaveSquadAndMassBattleRules,
    );

    expect(answerText).toContain("current troop rules are in NPC Core");
    expect(answerText).toContain("four contiguous 10-foot-square segments");
    expect(answerText).toContain(
      "do not assume every Troop is weak to area or splash damage",
    );
    expect(answerText).toContain("until one side breaks");
    expect(answerText).toContain(
      "rather than ending after a preset number of rounds",
    );
  });
});
