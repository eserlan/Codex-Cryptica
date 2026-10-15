import { describe, it, expect } from "vitest";
import { parseTovMechanics } from "../src/tov-mechanics-parser";

describe("parseTovMechanics", () => {
  it("parses valid TovQuickNpc mechanics direct bundle", () => {
    const raw = {
      systemId: "tales-of-the-valiant",
      kind: "tov-quick-npc",
      data: {
        cr: "1/2",
        ac: 13,
        hp: 18,
        hitDice: "3d8+3",
        attackName: "Shortbow",
        attackBonus: 4,
        attackFormula: "1d20+4",
        damageFormula: "1d6+2",
        damageType: "piercing",
      },
    };

    const parsed = parseTovMechanics(raw);
    expect(parsed).toBeDefined();
    expect(parsed?.kind).toBe("tov-quick-npc");
    if (parsed?.kind === "tov-quick-npc") {
      expect(parsed.data.cr).toBe("1/2");
      expect(parsed.data.ac).toBe(13);
      expect(parsed.data.attackName).toBe("Shortbow");
    }
  });

  it("parses wrapped { mechanics: ... } payload", () => {
    const raw = {
      title: "Forest Hunter",
      lore: "A skilled archer...",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-quick-npc",
        data: {
          cr: "1",
          ac: 14,
          hp: 22,
          hitDice: "4d8+4",
          attackName: "Longbow",
          attackBonus: 5,
          attackFormula: "1d20+5",
          damageFormula: "1d8+3",
        },
      },
    };

    const parsed = parseTovMechanics(raw);
    expect(parsed).toBeDefined();
    expect(parsed?.kind).toBe("tov-quick-npc");
  });

  it("parses JSON string payload", () => {
    const jsonStr = JSON.stringify({
      systemId: "tales-of-the-valiant",
      kind: "tov-magic-item",
      data: {
        rarity: "Rare",
        category: "Weapon",
        attunement: true,
        activationAction: "Action",
        rulesText: "You gain a +1 bonus to attack and damage rolls.",
      },
    });

    const parsed = parseTovMechanics(jsonStr);
    expect(parsed).toBeDefined();
    expect(parsed?.kind).toBe("tov-magic-item");
  });

  it("returns undefined for invalid or missing mechanics", () => {
    expect(parseTovMechanics(null)).toBeUndefined();
    expect(parseTovMechanics(undefined)).toBeUndefined();
    expect(parseTovMechanics("not-json")).toBeUndefined();
    expect(parseTovMechanics({ invalid: true })).toBeUndefined();
    expect(
      parseTovMechanics({ systemId: "other-system", kind: "tov-quick-npc" }),
    ).toBeUndefined();
  });
});
