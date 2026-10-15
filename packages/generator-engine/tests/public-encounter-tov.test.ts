import { describe, it, expect } from "vitest";
import { getGenerator } from "../src/campaign-generator-registry";
import type { GeneratorRunRequest } from "../src/campaign-generator-types";
import { parseEncounterResponse } from "../src/public-encounter";

describe("Tales of the Valiant Encounter Generation (US1 & US2)", () => {
  const encounterGen = getGenerator("encounter")!;

  it("registers gameSystem, partySize, and partyLevel options on the encounter generator", () => {
    expect(encounterGen).toBeDefined();

    const gameSystemOpt = encounterGen.options.find(
      (o) => o.id === "gameSystem",
    );
    expect(gameSystemOpt).toBeDefined();
    expect(gameSystemOpt?.control).toBe("select");
    expect(gameSystemOpt?.choices).toEqual(
      expect.arrayContaining([
        { value: "system-neutral", label: "System Neutral" },
        { value: "tales-of-the-valiant", label: "Tales of the Valiant" },
      ]),
    );

    const partySizeOpt = encounterGen.options.find((o) => o.id === "partySize");
    expect(partySizeOpt).toBeDefined();
    expect(partySizeOpt?.control).toBe("number");
    expect(partySizeOpt?.defaultValue).toBe(4);
    expect(partySizeOpt).toMatchObject({ min: 1, max: 8, step: 1 });
    expect(partySizeOpt?.visibleWhen).toEqual({
      optionId: "gameSystem",
      values: ["tales-of-the-valiant"],
    });

    const partyLevelOpt = encounterGen.options.find(
      (o) => o.id === "partyLevel",
    );
    expect(partyLevelOpt).toBeDefined();
    expect(partyLevelOpt?.control).toBe("number");
    expect(partyLevelOpt?.defaultValue).toBe(3);
    expect(partyLevelOpt).toMatchObject({ min: 1, max: 20, step: 1 });
    expect(partyLevelOpt?.visibleWhen).toEqual({
      optionId: "gameSystem",
      values: ["tales-of-the-valiant"],
    });
  });

  it("generates system-neutral prompt by default without ToV encounter instructions", () => {
    const request: GeneratorRunRequest = {
      generatorId: "encounter",
      options: { encounterType: "Combat", threat: "Moderate" },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = encounterGen.buildPrompt(request);
    expect(prompt).not.toContain(
      "GAME SYSTEM RULES LAYER: Tales of the Valiant",
    );
    expect(prompt).not.toContain("tov-encounter");
  });

  it("injects ToV party profile and encounter guidance rules when gameSystem is tales-of-the-valiant", () => {
    const request: GeneratorRunRequest = {
      generatorId: "encounter",
      options: {
        encounterType: "Combat",
        threat: "Dangerous",
        gameSystem: "tales-of-the-valiant",
        partySize: 5,
        partyLevel: 4,
      },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = encounterGen.buildPrompt(request);
    expect(prompt).toContain("GAME SYSTEM RULES LAYER: Tales of the Valiant");
    expect(prompt).toContain("Party Profile: 5 characters at Level 4.");
    expect(prompt).toContain('"kind": "tov-encounter"');
    expect(prompt).toContain("qualitativeDifficulty");
    expect(prompt).toContain("recommendedCrRange");
    expect(prompt).toContain("suggestedCreatures");
    expect(prompt).toContain("doomNotes");
  });

  it.each([
    { partySize: 9, partyLevel: 3 },
    { partySize: 4, partyLevel: 21 },
    { partySize: 2.5, partyLevel: 3 },
    { partySize: 4, partyLevel: 3.5 },
    { partySize: 0, partyLevel: -1 },
  ])("falls back to defaults for invalid ToV party values: %o", (party) => {
    const prompt = encounterGen.buildPrompt({
      generatorId: "encounter",
      options: {
        gameSystem: "tales-of-the-valiant",
        ...party,
      },
      useAI: true,
      themeId: "fantasy",
    });

    expect(prompt).toContain("Party Profile: 4 characters at Level 3.");
  });

  it.each([
    { partySize: 1, partyLevel: 1 },
    { partySize: 8, partyLevel: 20 },
  ])("accepts ToV party values at the bounds: %o", (party) => {
    const prompt = encounterGen.buildPrompt({
      generatorId: "encounter",
      options: {
        gameSystem: "tales-of-the-valiant",
        ...party,
      },
      useAI: true,
      themeId: "fantasy",
    });

    expect(prompt).toContain(
      `Party Profile: ${party.partySize} characters at Level ${party.partyLevel}.`,
    );
  });

  it("parses valid TovEncounterMechanics block correctly", () => {
    const mockJson = JSON.stringify({
      title: "Gloom Ambuscade",
      summary: "A dangerous combat encounter unfolds in an ancient dungeon.",
      content:
        "### What the Players See\nShadows flicker along the ruined walls as guttural snarls echo from the darkness ahead.",
      glance: {
        participants: "A shadow caller and its pack",
        immediateSituation: "Hounds encircle the entry passage.",
        stakes: "Survival and safe passage through the vault.",
      },
      lore: "### Situation & Stakes\nThe pack has staked claim to this antechamber.",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-encounter",
        isHomebrew: false,
        data: {
          qualitativeDifficulty: "Dangerous for 4 Level 3 characters",
          recommendedCrRange: "CR 1/2 minions with a CR 3 pack leader",
          suggestedCreatures: [
            {
              name: "Shadow Hound",
              cr: "1/2",
              count: 3,
              role: "Skirmisher",
              isHomebrew: false,
            },
            {
              name: "Gloom Caller",
              cr: "3",
              count: 1,
              role: "Controller / Boss",
              isHomebrew: false,
            },
          ],
          tacticalAdvice:
            "The caller stays back and blinds the vanguard with magical gloom while the hounds flank.",
          doomNotes:
            "The Gloom Caller holds 2 Doom Points. Spend 1 Doom as a reaction to extinguish a nonmagical light.",
          isHomebrew: false,
        },
      },
    });

    const output = parseEncounterResponse(mockJson, {
      genre: "Classic Fantasy",
      encounterType: "Combat",
      environment: "Dungeon",
      threat: "Dangerous",
      tone: "Tense",
      encounterName: "The Shadow Ambush",
      gameSystem: "tales-of-the-valiant",
      partySize: 4,
      partyLevel: 3,
    });

    expect(output.title).toBe("Gloom Ambuscade");
    expect(output.systemId).toBe("tales-of-the-valiant");
    expect(output.mechanics).toBeDefined();
    expect(output.mechanics?.kind).toBe("tov-encounter");

    if (output.mechanics && output.mechanics.kind === "tov-encounter") {
      expect(output.mechanics.data.qualitativeDifficulty).toContain(
        "Dangerous for 4 Level 3 characters",
      );
      expect(output.mechanics.data.suggestedCreatures).toHaveLength(2);
      expect(output.mechanics.data.suggestedCreatures[0].name).toBe(
        "Shadow Hound",
      );
      expect(output.mechanics.data.suggestedCreatures[0].count).toBe(3);
      expect(output.mechanics.data.doomNotes).toContain("2 Doom Points");
    }
  });

  it("handles homebrew markings on suggested creatures and encounter advice", () => {
    const mockJson = JSON.stringify({
      title: "Clockwork Gatekeeper",
      summary: "A moderate combat encounter.",
      content: "### What the Players See\nA bronze automaton stands guard.",
      glance: {
        participants: "Clockwork sentinel",
        immediateSituation: "The machine raises its halberd.",
        stakes: "Access to the inner sanctum.",
      },
      lore: "### Situation & Stakes\nGuarding the vault.",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-encounter",
        isHomebrew: true,
        homebrewNotice: "Custom clockwork sentinel not in BFRD baseline",
        data: {
          qualitativeDifficulty: "Moderate for 4 Level 2 characters",
          recommendedCrRange: "Single CR 2 adversary",
          suggestedCreatures: [
            {
              name: "Custom Brass Sentinel",
              cr: "2",
              count: 1,
              role: "Defender",
              isHomebrew: true,
            },
          ],
          tacticalAdvice:
            "Attacks nearest foe, retreats if damaged below 25% HP.",
          isHomebrew: true,
        },
      },
    });

    const output = parseEncounterResponse(mockJson, {
      genre: "Steampunk",
      encounterType: "Combat",
      environment: "Factory",
      threat: "Moderate",
      tone: "Tense",
      encounterName: "Clockwork Gatekeeper",
      gameSystem: "tales-of-the-valiant",
    });

    expect(output.mechanics?.isHomebrew).toBe(true);
    if (output.mechanics?.kind === "tov-encounter") {
      expect(output.mechanics.data.isHomebrew).toBe(true);
      expect(output.mechanics.data.suggestedCreatures[0].isHomebrew).toBe(true);
    }
  });

  it("leaves mechanics undefined when gameSystem is system-neutral even if response includes mechanics", () => {
    const mockJson = JSON.stringify({
      title: "Neutral Ambush",
      summary: "A neutral combat encounter.",
      content: "### What the Players See\nBandits emerge.",
      glance: {
        participants: "Local bandits",
        immediateSituation: "Demanding coins.",
        stakes: "Your coin purse.",
      },
      lore: "### Situation & Stakes\nRoadside holdup.",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-encounter",
        data: {
          qualitativeDifficulty: "Trivial",
          recommendedCrRange: "CR 1/8",
          suggestedCreatures: [],
          tacticalAdvice: "They flee if wounded.",
        },
      },
    });

    const output = parseEncounterResponse(mockJson, {
      genre: "Classic Fantasy",
      encounterType: "Combat",
      environment: "Road",
      threat: "Trivial",
      tone: "Tense",
      encounterName: "Neutral Ambush",
      gameSystem: "system-neutral",
    });

    expect(output.mechanics).toBeUndefined();
  });
});
