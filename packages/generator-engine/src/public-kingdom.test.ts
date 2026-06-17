import { describe, expect, it } from "vitest";
import {
  buildKingdomPrompt,
  generateKingdomLocal,
  kingdomConfig,
  parseKingdomResponse,
} from "./public-kingdom";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateKingdomLocal", () => {
  it("returns the faction kingdom structure", () => {
    const out = generateKingdomLocal({}, seededRng(5));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### The Realm");
    expect(out.content).toContain("### Government & Power");
    expect(out.lore).toContain("### Major Factions");
    expect(out.lore).toContain("### Entity Seeds");
    expect(out.labels).toContain("kingdom-generator");
  });

  it("honours explicit options and campaign context", () => {
    const out = generateKingdomLocal(
      {
        polityType: "Empire",
        governmentStyle: "Hereditary dynasty",
        geography: "Temperate highlands",
        scale: "Large empire (many provinces)",
        conflictLevel: "Simmering tensions",
        magicLevel: "Common but regulated",
        campaignContext: "a crumbling empire on the edge of civil war",
      },
      seededRng(2),
    );
    expect(out.summary).toContain("empire");
    expect(out.summary).toContain("temperate highlands");
    expect(out.content).toContain("crumbling empire");
    expect(out.lore).toContain("Common but regulated");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateKingdomLocal({}, seededRng(9))).toEqual(
      generateKingdomLocal({}, seededRng(9)),
    );
  });
});

describe("buildKingdomPrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { systemInstruction, userMessage, resolved } = buildKingdomPrompt(
      {
        polityType: "Duchy",
        governmentStyle: "Elected council",
        geography: "River delta",
        conflictLevel: "Open conflict",
      },
      "- Existing: House Veyr (faction)",
      seededRng(4),
    );
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("House Veyr");
    expect(userMessage).toContain("- Polity Type: Duchy");
    expect(userMessage).toContain("- Geography: River delta");
    expect(userMessage).toContain("- Naming Directive:");
    expect(resolved.conflictLevel).toBe("Open conflict");
  });

  it("keeps the public config data", () => {
    expect(kingdomConfig.polityTypes).toContain("Kingdom");
    expect(kingdomConfig.magicLevels).toContain("Magic-dependent society");
  });
});

describe("parseKingdomResponse", () => {
  it("parses fenced JSON and preserves labels", () => {
    const out = parseKingdomResponse(
      '```json\n{"title":"The Iron March","summary":"x","content":"### The Realm","lore":"### At a Glance","labels":["custom"]}\n```',
    );
    expect(out.title).toBe("The Iron March");
    expect(out.labels).toContain("custom");
  });

  it("falls back to defaults and throws on invalid JSON", () => {
    expect(parseKingdomResponse('{"content":"x","lore":"y"}').title).toBe(
      "The Unnamed Realm",
    );
    expect(() => parseKingdomResponse("nope")).toThrow();
  });
});
