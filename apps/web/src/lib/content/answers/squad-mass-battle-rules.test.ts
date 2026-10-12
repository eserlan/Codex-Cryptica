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

  it("distinguishes Mook bookkeeping from individual actions and states Support effects", () => {
    const answerText = JSON.stringify(
      whichTabletopRpgsHaveSquadAndMassBattleRules,
    );

    expect(answerText).toContain(
      "They still move and attack individually, so this reduces HP bookkeeping rather than the number of activations",
    );
    expect(answerText).toContain(
      "a success grants +1 and inflicts Fatigue, while a raise grants +2 or a Battle Effect without Fatigue",
    );
  });

  it("keeps the worked Mook damage example's pool arithmetic accurate", () => {
    const answerText = JSON.stringify(
      whichTabletopRpgsHaveSquadAndMassBattleRules,
    );

    expect(answerText).toContain("Give the five 5-HP Mooks one 25-HP pool");
    expect(answerText).toContain(
      "The fighter deals 7 damage: one Mook falls and 2 damage carries over, leaving 3 HP on the next",
    );
    expect(answerText).toContain(
      "A second attack deals 9 damage to the mob: it removes that Mook's remaining 3 HP and 5 HP from the next, with 1 damage carrying to another",
    );
    expect(answerText).toContain(
      "The pool has 9 HP left, with three Mooks fallen and two still standing; one has taken 1 damage",
    );
  });
});
