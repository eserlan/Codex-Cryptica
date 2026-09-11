import { describe, expect, it } from "vitest";
import {
  buildCreaturePrompt,
  creatureConfig,
  generateCreatureLocal,
  parseCreatureResponse,
  resolveCreature,
} from "./public-creature";

const fixedRng = () => 0.25;

describe("Public Creature generator", () => {
  it("resolves options with sensible defaults and respects explicit values", () => {
    const resolved = resolveCreature(
      {
        genre: "Cyberpunk / Corporate",
        category: "Engineered / Mutated Beast",
        threatLevel: "Apex Predator / Pack Threat",
        size: "Large / Steed-sized",
        temperament: "Cunning / Pack Mind",
        habitat: "Urban Sewers & Ruins",
        ecologicalRole: "Ambush Hunter",
        campaignContext: "Neon district storm channels.",
      },
      fixedRng,
    );

    expect(resolved.genre).toBe("Cyberpunk / Corporate");
    expect(resolved.category).toBe("Engineered / Mutated Beast");
    expect(resolved.threatLevel).toBe("Apex Predator / Pack Threat");
    expect(resolved.size).toBe("Large / Steed-sized");
    expect(resolved.temperament).toBe("Cunning / Pack Mind");
    expect(resolved.habitat).toBe("Urban Sewers & Ruins");
    expect(resolved.ecologicalRole).toBe("Ambush Hunter");
    expect(resolved.campaignContext).toBe("Neon district storm channels.");
    expect(resolved.creatureName).toBeTruthy();
  });

  it("generates deterministic local output with rich content and lore", () => {
    const output = generateCreatureLocal(
      {
        genre: "Classic Fantasy",
        category: "Magical Beast / Chimera",
        threatLevel: "Dangerous / Predator",
        size: "Medium / Human-sized",
        temperament: "Instinctual / Animal",
        habitat: "Dense Forest / Deep Jungle",
        ecologicalRole: "Apex Predator",
      },
      fixedRng,
    );

    expect(output.type).toBe("creature");
    expect(output.kind).toBe("creature");
    expect(output.title).toBeTruthy();
    expect(output.summary).toBeTruthy();

    // Public / Table-visible content assertions
    expect(output.content).toContain("### At a Glance");
    expect(output.content).toContain("### Appearance & Anatomy");
    expect(output.content).toContain("### Core Concept & Ecology");
    expect(output.content).toContain("### Observable Abilities & Defences");
    expect(output.content).toContain("### Known Weaknesses & Limitations");
    expect(output.content).toContain("### Combat & Encounter Behaviour");
    expect(output.content).toContain("### Harvest & Remains");
    expect(output.content).toContain("### Known Lore & Signs");

    // GM-only secret lore assertions
    expect(output.lore).toContain("### True Origin & Hidden Ecology");
    expect(output.lore).toContain("### Hidden Abilities & Surprises");
    expect(output.lore).toContain("### Secret Weaknesses");
    expect(output.lore).toContain("### Tactical Notes");
    expect(output.lore).toContain("### Truth Behind Rumours");
    expect(output.lore).toContain("### Adventure & Encounter Hooks");

    expect(output.labels).toContain("creature");
    expect(output.labels).toContain("monster-generator");
    expect(output.status).toBe("active");
  });

  it("includes public and secret sapience details when creature is sapient", () => {
    const output = generateCreatureLocal(
      {
        genre: "Sci-Fi / Space Opera",
        category: "Alien Fauna / Xenoform",
        temperament: "Fully Sapient / Cultured",
      },
      fixedRng,
    );

    expect(output.content).toContain("### Sapience & Society");
    expect(output.content).toContain("Communication");
    expect(output.content).toContain("Visible Customs");
    expect(output.lore).toContain("### Secret Motives & Hidden Society");
    expect(output.lore).toContain("Covert Hierarchy");
  });

  it("builds a prompt with consistency pass, quality guardrails, and avoidNames", () => {
    const prompt = buildCreaturePrompt(
      {
        genre: "Cosmic Horror",
        category: "Aberration / Eldritch Horror",
        avoidNames: ["Void-Stalker", "Dusk-Gorgon"],
        campaignContext: "Sunken temple beneath the bay.",
      },
      "Session Context: previous monsters generated.",
      fixedRng,
    );

    expect(prompt.userMessage).toContain("Cosmic Horror");
    expect(prompt.userMessage).toContain("Aberration / Eldritch Horror");
    expect(prompt.userMessage).toContain("Sunken temple beneath the bay");
    expect(prompt.userMessage).toContain(
      "Already created or used this session",
    );
    expect(prompt.userMessage).toContain("Void-Stalker");
    expect(prompt.userMessage).toContain("Dusk-Gorgon");
    expect(prompt.userMessage).toContain(
      "Decide what is observable to players versus what is secret GM knowledge",
    );
    expect(prompt.userMessage).toContain(
      "Session Context: previous monsters generated.",
    );
    expect(prompt.systemInstruction).toContain(
      "expert tabletop RPG creature and monster designer",
    );
  });

  it("parses valid AI JSON response into PublicGeneratorOutput", () => {
    const resolved = resolveCreature({}, fixedRng);
    const json = JSON.stringify({
      title: "Gloom-Crawler",
      summary:
        "A subterranean arachnid predator that traps prey in vibrating silk webs.",
      content:
        "### At a Glance\n- Classification: Beast\n### Appearance & Anatomy\nEight jointed legs.",
      lore: "### Core Concept & Ecology\nLives in deep caves.\n### Abilities & Defences\nPoison bite.",
      labels: ["custom-beast"],
    });

    const output = parseCreatureResponse(json, resolved);
    expect(output.title).toBe("Gloom-Crawler");
    expect(output.summary).toBe(
      "A subterranean arachnid predator that traps prey in vibrating silk webs.",
    );
    expect(output.content).toContain("### At a Glance");
    expect(output.lore).toContain("### Core Concept & Ecology");
    expect(output.labels).toContain("creature");
    expect(output.labels).toContain("monster-generator");
    expect(output.labels).toContain("custom-beast");
    expect(output.type).toBe("creature");
  });

  it("throws when AI response lacks substantive content or lore", () => {
    const resolved = resolveCreature({}, fixedRng);
    const json = JSON.stringify({
      title: "Thin Creature",
      summary: "No body.",
    });

    expect(() => parseCreatureResponse(json, resolved)).toThrow(
      "Creature response must include substantive content and lore.",
    );
  });

  it("exports configuration options for all UI selector fields", () => {
    expect(creatureConfig.genres.length).toBeGreaterThan(0);
    expect(creatureConfig.categories).toContain("Natural Beast");
    expect(creatureConfig.categories).toContain("Colossal / Kaiju-Scale Titan");
    expect(creatureConfig.threatLevels).toContain(
      "Apex Predator / Pack Threat",
    );
    expect(creatureConfig.sizes).toContain("Gargantuan / Titanic");
    expect(creatureConfig.temperaments).toContain("Cunning / Pack Mind");
    expect(creatureConfig.habitats).toContain("Subterranean / Caverns");
    expect(creatureConfig.ecologicalRoles).toContain("Ambush Hunter");
  });
});
