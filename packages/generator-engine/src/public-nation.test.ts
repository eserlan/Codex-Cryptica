import { describe, expect, it } from "vitest";
import {
  buildNationPrompt,
  generateNationLocal,
  nationConfig,
  parseNationResponse,
} from "./public-nation";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateNationLocal", () => {
  it("returns the faction nation structure", () => {
    const out = generateNationLocal({}, seededRng(5));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### The State");
    expect(out.content).toContain("### Power Structure");
    expect(out.lore).toContain("### Power Blocs");
    expect(out.lore).toContain("### Entity Seeds");
    expect(out.labels).toContain("nation-generator");
  });

  it("honours explicit options and campaign context", () => {
    const out = generateNationLocal(
      {
        genre: "Cyberpunk",
        polityType: "Megacorp-State",
        governmentStyle: "Corporate board",
        scale: "Large empire (many provinces)",
        conflictLevel: "Open conflict",
        campaignContext: "a corporate cold war over orbital elevators",
      },
      seededRng(2),
    );
    expect(out.summary).toContain("megacorp-state");
    expect(out.summary).toContain("corporate board");
    expect(out.content).toContain("corporate cold war");
    expect(out.lore).toContain("Open conflict");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateNationLocal({}, seededRng(9))).toEqual(
      generateNationLocal({}, seededRng(9)),
    );
  });
});

describe("buildNationPrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { systemInstruction, userMessage, resolved } = buildNationPrompt(
      {
        genre: "Sci-Fi",
        polityType: "Trade Consortium",
        governmentStyle: "Oligarchy",
        conflictLevel: "Simmering tensions",
      },
      "- Existing: Helix Concord (faction)",
      seededRng(4),
    );
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("Helix Concord");
    expect(userMessage).toContain("- Genre / Setting: Sci-Fi");
    expect(userMessage).toContain("- Polity Type: Trade Consortium");
    expect(resolved.conflictLevel).toBe("Simmering tensions");
  });

  it("keeps the public config data", () => {
    expect(nationConfig.genres).toContain("Cyberpunk");
    expect(nationConfig.polityTypesByGenre.Western).toContain("Territory");
    expect(nationConfig.polityTypesByGenre["Cosmic Horror"]).toContain(
      "Restricted Research Territory",
    );
    expect(nationConfig.polityTypesByGenre["Space Western"]).toContain(
      "Frontier System Authority",
    );
  });
});

describe("parseNationResponse", () => {
  it("parses fenced JSON and preserves labels", () => {
    const out = parseNationResponse(
      '```json\n{"title":"Helix Concord","summary":"x","content":"### The State","lore":"### At a Glance","labels":["custom"]}\n```',
    );
    expect(out.title).toBe("Helix Concord");
    expect(out.labels).toContain("custom");
  });

  it("falls back to defaults and throws on invalid JSON", () => {
    expect(parseNationResponse('{"content":"x","lore":"y"}').title).toBe(
      "The Unnamed State",
    );
    expect(() => parseNationResponse("nope")).toThrow();
  });
});

// Superhero / Comic Book genre content (#3125): nationConfig used to have
// no entry for this genre, so random-idea.ts's themeToHubGenre mapping fell
// back to "Modern" (#3108). It now has real polity types of its own.
describe("Superhero / Comic Book genre (#3125)", () => {
  it("has its own polity-type pool, not the Fantasy fallback", () => {
    expect(nationConfig.genres).toContain("Superhero / Comic Book");
    expect(nationConfig.polityTypesByGenre["Superhero / Comic Book"]).toContain(
      "Secret Government Agency",
    );

    const out = generateNationLocal(
      { genre: "Superhero / Comic Book" },
      seededRng(9),
    );
    expect(out.type).toBe("faction");
    expect(out.content).toBeTruthy();
  });
});

// Wording regressions: the conflict level, polity type and scale are inserted
// into sentences, so each must read as grammatical English for every value.
describe("generateNationLocal wording", () => {
  const base = {
    genre: "Fantasy",
    governmentStyle: "Oligarchy",
    scale: "Mid-sized nation",
  };

  it("reads the conflict level as a state, not as a noun before the polity", () => {
    for (const conflictLevel of nationConfig.conflictLevels) {
      const out = generateNationLocal(
        { ...base, polityType: "Kingdom", conflictLevel },
        seededRng(7),
      );
      expect(out.summary).toContain(
        `currently ${conflictLevel.toLowerCase()}.`,
      );
      expect(out.summary).toMatch(/^A kingdom operating under oligarchy/);
      expect(out.summary).not.toMatch(/^A (at|open|total|simmering|post-war)/);
    }
  });

  it("never places a conflict phrase directly after a preposition as a noun", () => {
    for (const conflictLevel of nationConfig.conflictLevels) {
      const out = generateNationLocal(
        { ...base, polityType: "Kingdom", conflictLevel },
        seededRng(11),
      );
      expect(out.content).not.toMatch(
        /\b(at|under|to) (at peace|open conflict|total war|simmering tensions|post-war recovery)\b/,
      );
      expect(out.content).not.toMatch(/\bat at\b/);
    }
  });

  it("uses 'an' before a vowel-initial polity type", () => {
    const out = generateNationLocal(
      {
        ...base,
        genre: "Sci-Fi",
        polityType: "Interstellar Federation",
        conflictLevel: "At peace",
      },
      seededRng(3),
    );
    expect(out.summary).toMatch(/^An interstellar federation operating/);
    expect(out.content).toContain("is an interstellar federation under");
    expect(out.summary).not.toMatch(/\bA interstellar/);
  });

  it("uses 'a' before a consonant-initial polity type", () => {
    const out = generateNationLocal(
      { ...base, polityType: "Kingdom", conflictLevel: "Total war" },
      seededRng(5),
    );
    expect(out.content).toContain("is a kingdom under oligarchy");
  });

  it("states the scale once, without repeating the polity noun", () => {
    const out = generateNationLocal(
      {
        ...base,
        polityType: "City-State",
        scale: "City-state (single settlement)",
        conflictLevel: "At peace",
      },
      seededRng(9),
    );
    expect(out.content).toContain(
      "is a city-state under oligarchy, at a scale of city-state (single settlement).",
    );
    expect(out.content).not.toContain(
      "city-state (single settlement) city-state",
    );
  });
});
