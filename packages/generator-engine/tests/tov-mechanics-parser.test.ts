import { describe, it, expect } from "vitest";
import {
  parseTovMechanics,
  isPublishedBfrdDoomGuidance,
} from "../src/tov-mechanics-parser";

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

describe("isPublishedBfrdDoomGuidance", () => {
  it("accepts encounter-level pool and published BFRD spends", () => {
    expect(
      isPublishedBfrdDoomGuidance(
        "Start the encounter with a CR-based encounter-level GM Doom pool of 3 points. Spend Doom to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter refresh, recharge, or gain one additional use of a limited-use feature.",
      ),
    ).toBe(true);
  });

  it("rejects an unrecognised spend added to a published spend", () => {
    expect(
      isPublishedBfrdDoomGuidance(
        "Start with a CR-based encounter-level GM Doom pool. Spend Doom to give a creature advantage on an attack or force a reroll.",
      ),
    ).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "Start with a CR-based encounter-level GM Doom pool. Spend Doom to give a creature advantage on an attack or curse a PC.",
      ),
    ).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "Start with a CR-based encounter-level GM Doom pool. Spend Doom to give a creature advantage on an attack. Doom can also knock the target prone.",
      ),
    ).toBe(false);
  });

  it("flags an unrecognised effect sequenced after a published spend", () => {
    const doomNotes =
      "Start with a CR-based encounter-level GM Doom pool. Spend Doom to give a creature advantage on an attack, then knock the target prone.";

    expect(isPublishedBfrdDoomGuidance(doomNotes)).toBe(false);

    const parsed = parseTovMechanics({
      systemId: "tales-of-the-valiant",
      kind: "tov-encounter",
      data: {
        qualitativeDifficulty: "Moderate",
        recommendedCrRange: "1-2",
        doomNotes,
      },
    });

    expect(parsed?.kind).toBe("tov-encounter");
    if (parsed?.kind === "tov-encounter") {
      expect(parsed.isHomebrew).toBe(true);
      expect(parsed.data.isHomebrew).toBe(true);
      expect(parsed.data.doomNotes).toContain("[Homebrew]");
    }
  });

  it("accepts published Doom spends sequenced after another published spend", () => {
    const doomNotes =
      "Start the encounter with a CR-based encounter-level GM Doom pool. Spend Doom to give a creature advantage on an attack. Then spend Doom to give a PC disadvantage on a save.";

    expect(isPublishedBfrdDoomGuidance(doomNotes)).toBe(true);

    const parsed = parseTovMechanics({
      systemId: "tales-of-the-valiant",
      kind: "tov-encounter",
      data: {
        qualitativeDifficulty: "Moderate",
        recommendedCrRange: "1-2",
        doomNotes,
      },
    });

    expect(parsed?.kind).toBe("tov-encounter");
    if (parsed?.kind === "tov-encounter") {
      expect(parsed.isHomebrew).not.toBe(true);
      expect(parsed.data.isHomebrew).not.toBe(true);
      expect(parsed.data.doomNotes).not.toContain("[Homebrew]");
    }
  });

  it("does not treat unrelated healing prose as a Doom spend", () => {
    expect(
      isPublishedBfrdDoomGuidance(
        "Use a CR-based encounter-level GM Doom pool. Spend Doom to give a creature advantage on an attack; after the fight, heal the party.",
      ),
    ).toBe(true);
  });

  it("requires explicit encounter-pool scope and a recognised published spend", () => {
    expect(
      isPublishedBfrdDoomGuidance(
        "Start a CR-based creature pool. Spend Doom to give a creature advantage on an attack.",
      ),
    ).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "Use a CR-based encounter-level GM Doom pool, scoped strictly to individual creatures. Spend Doom to give a creature advantage on an attack.",
      ),
    ).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "Start with a CR-based encounter-level GM Doom pool. Spend Doom to grant a reroll.",
      ),
    ).toBe(false);
  });

  it("rejects empty, homebrew-labelled, creature-only, or invented Doom spend guidance", () => {
    expect(isPublishedBfrdDoomGuidance("   ")).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "[Homebrew] Spend 1 Doom to give a creature advantage on an attack.",
      ),
    ).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "Doom points are scoped strictly to individual creatures, not an encounter-level GM pool.",
      ),
    ).toBe(false);
    expect(
      isPublishedBfrdDoomGuidance(
        "Spend 2 Doom to summon reinforcements or trigger a lair hazard.",
      ),
    ).toBe(false);
  });
});
