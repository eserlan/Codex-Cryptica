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

// Regression test (#3108): nationConfig is its own closed genre system
// (Fantasy, Cyberpunk, Modern, ...) that does not include
// "Superhero / Comic Book". It's reached only via random-idea.ts's
// themeToHubGenre mapping, which maps Superhero to "Modern" — a real key
// with real content, so this never actually crashes. Confirm that directly
// too, in case a caller ever passes the raw theme through.
describe("Superhero theme regression (#3108)", () => {
  it("falls back to the Fantasy polity-type pool for an unmapped genre", () => {
    expect(
      nationConfig.polityTypesByGenre["Superhero / Comic Book"],
    ).toBeUndefined();

    const out = generateNationLocal(
      { genre: "Superhero / Comic Book" },
      seededRng(9),
    );
    expect(out.type).toBe("faction");
    expect(out.content).toBeTruthy();
  });
});
