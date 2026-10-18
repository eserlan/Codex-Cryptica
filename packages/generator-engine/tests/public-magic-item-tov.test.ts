import { describe, it, expect } from "vitest";
import { getGenerator } from "../src/campaign-generator-registry";
import type {
  GeneratorRunRequest,
  GeneratorOutput,
} from "../src/campaign-generator-types";

describe("Tales of the Valiant Magic Item Generation (US3)", () => {
  const magicItemGen = getGenerator("magic-item")!;
  const minorMagicItemGen = getGenerator("minor-magic-item")!;

  it("registers gameSystem option on magic-item and minor-magic-item generators", () => {
    expect(magicItemGen).toBeDefined();
    const miSystemOpt = magicItemGen.options.find((o) => o.id === "gameSystem");
    expect(miSystemOpt).toBeDefined();
    expect(miSystemOpt?.control).toBe("select");
    expect(miSystemOpt?.choices).toEqual(
      expect.arrayContaining([
        { value: "system-neutral", label: "System Neutral" },
        { value: "tales-of-the-valiant", label: "Tales of the Valiant" },
      ]),
    );

    expect(minorMagicItemGen).toBeDefined();
    const minorSystemOpt = minorMagicItemGen.options.find(
      (o) => o.id === "gameSystem",
    );
    expect(minorSystemOpt).toBeDefined();
    expect(minorSystemOpt?.control).toBe("select");
  });

  it("generates system-neutral prompt by default without ToV item instructions", () => {
    const request: GeneratorRunRequest = {
      generatorId: "magic-item",
      options: { rarity: "Rare", kind: "Weapon" },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = magicItemGen.buildPrompt(request);
    expect(prompt).not.toContain(
      "GAME SYSTEM RULES LAYER: Tales of the Valiant",
    );
    expect(prompt).not.toContain("tov-magic-item");
  });

  it("injects BFRD magic item rules when gameSystem is tales-of-the-valiant on magic-item", () => {
    const request: GeneratorRunRequest = {
      generatorId: "magic-item",
      options: {
        rarity: "Very Rare",
        kind: "Wondrous Item",
        gameSystem: "tales-of-the-valiant",
      },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = magicItemGen.buildPrompt(request);
    expect(prompt).toContain("GAME SYSTEM RULES LAYER: Tales of the Valiant");
    expect(prompt).toContain("tov-magic-item");
    expect(prompt).toContain("Black Flag Reference Document");
    expect(prompt).toContain("attunement");
  });

  it("injects BFRD magic item rules when gameSystem is tales-of-the-valiant on minor-magic-item", () => {
    const request: GeneratorRunRequest = {
      generatorId: "minor-magic-item",
      options: {
        gameSystem: "tales-of-the-valiant",
      },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = minorMagicItemGen.buildPrompt(request);
    expect(prompt).toContain("GAME SYSTEM RULES LAYER: Tales of the Valiant");
    expect(prompt).toContain("tov-magic-item");
  });

  it("maps magic item output with mechanics to draft with metadata and undefined statSheet", () => {
    const output: GeneratorOutput = {
      title: "Lantern of Revealing Mist",
      summary: "A brass lantern that reveals phased spirits in cold mist.",
      lore: "Crafted by the lantern-bearers of the northern crags.",
      labels: ["item", "wondrous-item", "tales-of-the-valiant"],
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-magic-item",
        isHomebrew: false,
        data: {
          rarity: "Uncommon",
          category: "Wondrous Item",
          attunement: false,
          activationAction: "Action",
          charges: 3,
          rechargeRate: "1d3 at dawn",
          rulesText:
            "While lit, invisible creatures and objects are visible within 30 feet.",
          isHomebrew: false,
        },
      },
    };

    const request: GeneratorRunRequest = {
      generatorId: "magic-item",
      options: { gameSystem: "tales-of-the-valiant" },
      useAI: true,
      themeId: "fantasy",
    };

    const draft = magicItemGen.mapOutputToDraft(output, request);
    expect(draft.systemId).toBe("tales-of-the-valiant");
    expect(draft.mechanics).toBeDefined();
    expect(draft.mechanics?.kind).toBe("tov-magic-item");
    // Magic items do not attach a dedicated stat sheet template
    expect(draft.statSheet).toBeUndefined();
  });
});
