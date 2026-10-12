import { describe, expect, it } from "vitest";
import { whichTabletopRpgsHaveSquadAndMassBattleRules } from "./pages/which-tabletop-rpgs-have-squad-and-mass-battle-rules";

describe("squad and mass-battle answer rules", () => {
  it("uses current Pathfinder troop and Savage Worlds mass-battle rules", () => {
    const answerText = JSON.stringify(
      whichTabletopRpgsHaveSquadAndMassBattleRules,
    );

    expect(answerText).toContain("current general rules are in NPC Core");
    expect(answerText).toContain("four contiguous 10-foot-square segments");
    expect(answerText).toContain(
      "its defences and weaknesses depend on the rules and stat block",
    );
    expect(answerText).toContain(
      "A separate character-scale mission can also create an advantage, but that is optional scene framing, not a required part of each round",
    );
  });
});
