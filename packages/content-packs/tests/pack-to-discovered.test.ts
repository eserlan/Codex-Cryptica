import { describe, it, expect } from "vitest";
import { packToDiscoveredEntities } from "../src/pack-to-discovered.js";
import { fantasyBestiary } from "../src/packs/fantasy-bestiary.js";
import type { CreaturePack } from "../src/types.js";

const minimalPack: CreaturePack = {
  id: "test-pack",
  name: "Test Pack",
  description: "A test pack",
  genre: "fantasy",
  entries: [
    {
      title: "Goblin",
      category: "goblinoid",
      description: "A small green menace",
      habitat: "Caves and forests",
      behaviour: "Cowardly in groups, bold when outnumbering foes",
      threatLevel: "Low",
      variants: ["Hobgoblin", "Bugbear"],
      hooks: ["The goblins stole a farmer's pig"],
    },
    {
      title: "Wolf",
      category: "beast",
      description: "A grey predator",
      habitat: "Forests and tundra",
      behaviour: "Hunts in packs",
      threatLevel: "Low",
      variants: ["Dire Wolf"],
      hooks: ["A lone wolf follows the party"],
      combatNotes: "Knock Prone on hit",
    },
  ],
};

describe("packToDiscoveredEntities", () => {
  it("returns one entity per entry", () => {
    const result = packToDiscoveredEntities(minimalPack);
    expect(result.length).toBe(minimalPack.entries.length);
  });

  it("sets suggestedType to Creature for every entity", () => {
    const result = packToDiscoveredEntities(minimalPack);
    for (const entity of result) {
      expect(entity.suggestedType).toBe("Creature");
    }
  });

  it("includes creature-pack label on every entity", () => {
    const result = packToDiscoveredEntities(minimalPack);
    for (const entity of result) {
      expect(entity.frontmatter.labels).toContain("creature-pack");
    }
  });

  it("includes the entry category as a label", () => {
    const result = packToDiscoveredEntities(minimalPack);
    expect(result[0].frontmatter.labels).toContain("goblinoid");
    expect(result[1].frontmatter.labels).toContain("beast");
  });

  it("sets chronicle to entry description", () => {
    const result = packToDiscoveredEntities(minimalPack);
    expect(result[0].chronicle).toBe("A small green menace");
  });

  it("body contains required section headings", () => {
    const result = packToDiscoveredEntities(minimalPack);
    const body = result[0].content;
    expect(body).toContain("## Summary");
    expect(body).toContain("## Habitat");
    expect(body).toContain("## Behaviour");
    expect(body).toContain("## Threat Level");
    expect(body).toContain("## Variants");
    expect(body).toContain("## Story Hooks");
  });

  it("includes Combat Notes section only when combatNotes is present", () => {
    const result = packToDiscoveredEntities(minimalPack);
    expect(result[0].content).not.toContain("## Combat Notes");
    expect(result[1].content).toContain("## Combat Notes");
  });

  it("sets confidence to 1", () => {
    const result = packToDiscoveredEntities(minimalPack);
    for (const entity of result) {
      expect(entity.confidence).toBe(1);
    }
  });

  it("sets detectedLinks to empty array", () => {
    const result = packToDiscoveredEntities(minimalPack);
    for (const entity of result) {
      expect(entity.detectedLinks).toEqual([]);
    }
  });

  it("is pure: same input produces same output", () => {
    const a = packToDiscoveredEntities(minimalPack);
    const b = packToDiscoveredEntities(minimalPack);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("works against the real fantasy bestiary (smoke test)", () => {
    const result = packToDiscoveredEntities(fantasyBestiary);
    expect(result.length).toBe(fantasyBestiary.entries.length);
  });

  it("includes image in frontmatter when present on entry", () => {
    const packWithImage: CreaturePack = {
      ...minimalPack,
      entries: [
        {
          ...minimalPack.entries[0],
          image: "https://example.com/goblin.webp",
        },
      ],
    };
    const result = packToDiscoveredEntities(packWithImage);
    expect(result[0].frontmatter.image).toBe("https://example.com/goblin.webp");
  });
});

describe("packToDiscoveredEntities with existingTitles (US3)", () => {
  it("sets matchedEntityId when entry title slug is in existingTitles", () => {
    const existing = new Map([["goblin", "vault-id-123"]]);
    const result = packToDiscoveredEntities(minimalPack, existing);
    expect(result[0].matchedEntityId).toBe("vault-id-123");
    expect(result[1].matchedEntityId).toBeUndefined();
  });

  it("leaves matchedEntityId undefined when existingTitles is not provided", () => {
    const result = packToDiscoveredEntities(minimalPack);
    for (const entity of result) {
      expect(entity.matchedEntityId).toBeUndefined();
    }
  });
});
