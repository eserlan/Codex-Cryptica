import { describe, expect, it } from "vitest";
import {
  buildRandomTablePrompt,
  parseRandomTableResponse,
  generateRandomTableLocal,
} from "./public-random-table";
import type { RandomTableGenerationContext } from "./campaign-generator-types";

describe("public-random-table prompt builder", () => {
  it("builds a prompt with theme, topic, and entry count", () => {
    const context: RandomTableGenerationContext = {
      topic: "Smuggler's Cove Rumors",
      count: 10,
      theme: "fantasy",
    };

    const prompt = buildRandomTablePrompt(context);
    expect(prompt.userPrompt).toContain("Smuggler's Cove Rumors");
    expect(prompt.userPrompt).toContain("10 entries");
    expect(prompt.systemInstruction).toContain("random roll table");
  });

  it("prioritizes freeform campaign context and pins proper nouns", () => {
    const context: RandomTableGenerationContext = {
      topic: "Docklands Encounters",
      count: 6,
      campaignContext:
        "Focus on Captain Sera Voight and the sunken Iron Galleon",
    };

    const prompt = buildRandomTablePrompt(context);
    expect(prompt.userPrompt).toContain("HIGHEST PRIORITY");
    expect(prompt.userPrompt).toContain("Captain Sera Voight");
    expect(prompt.userPrompt).toContain("Iron Galleon");
  });

  it("injects available table and deck names for sub-table reference emission", () => {
    const context: RandomTableGenerationContext = {
      topic: "Wilderness Encounters",
      count: 8,
      availableTables: ["weather_hazards", "minor_loot", "beast_species"],
    };

    const prompt = buildRandomTablePrompt(context);
    expect(prompt.systemInstruction).toContain("{table_name}");
    expect(prompt.userPrompt).toContain("weather_hazards");
    expect(prompt.userPrompt).toContain("minor_loot");
    expect(prompt.userPrompt).toContain("beast_species");
  });

  it("injects grounding vault entities", () => {
    const context: RandomTableGenerationContext = {
      topic: "City Watch Patrols",
      count: 6,
      worldEntities: [
        {
          title: "Commander Vane",
          category: "character",
          summary: "Stern commander of the Silver Gate watch.",
        },
        {
          title: "The Rusty Anchor",
          category: "location",
          summary: "Tavern known for underworld informants.",
        },
      ],
    };

    const prompt = buildRandomTablePrompt(context);
    expect(prompt.userPrompt).toContain("Commander Vane (character)");
    expect(prompt.userPrompt).toContain("The Rusty Anchor (location)");
  });
});

describe("public-random-table response parser", () => {
  it("parses valid JSON structured table response", () => {
    const raw = JSON.stringify({
      title: "Dockside Encounters",
      description: "Events along the fog-laden harbor piers.",
      entries: [
        { text: "A lantern-bearer warns of high tide at {harbor_tides}." },
        { text: "Enforcers from House Vane demanding toll payments." },
      ],
    });

    const parsed = parseRandomTableResponse(raw);
    expect(parsed.title).toBe("Dockside Encounters");
    expect(parsed.description).toBe("Events along the fog-laden harbor piers.");
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].text).toContain("{harbor_tides}");
  });

  it("handles markdown fenced JSON response", () => {
    const raw =
      '```json\n{"title": "Forest Encounters", "entries": [{"text": "A wandering dryad"},{"text": "An abandoned camp"}]}\n```';

    const parsed = parseRandomTableResponse(raw);
    expect(parsed.title).toBe("Forest Encounters");
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].text).toBe("A wandering dryad");
  });

  it("falls back gracefully when response is unstructured lines", () => {
    const raw =
      "1. A shadowed figure slips into an alley\n2. Two merchants arguing over tariffs\n3. Guard patrol marching past";

    const parsed = parseRandomTableResponse(raw);
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[0].text).toBe(
      "A shadowed figure slips into an alley",
    );
    expect(parsed.entries[1].text).toBe("Two merchants arguing over tariffs");
    expect(parsed.entries[2].text).toBe("Guard patrol marching past");
  });
});

describe("public-random-table local fallback generator", () => {
  it("generates deterministic local candidate table entries offline", () => {
    const context: RandomTableGenerationContext = {
      topic: "Dungeon Hazards",
      count: 6,
      availableTables: ["traps"],
    };

    const result = generateRandomTableLocal(context);
    expect(result.title).toContain("Dungeon Hazards");
    expect(result.entries).toHaveLength(6);
    expect(result.entries.every((e) => e.text.length > 0)).toBe(true);
  });
});
