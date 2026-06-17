import { describe, expect, it } from "vitest";
import {
  buildSocialHubPrompt,
  buildTavernPrompt,
  generateSocialHubLocal,
  generateTavernLocal,
  parseSocialHubResponse,
  parseTavernResponse,
  socialHubConfig,
} from "./public-social-hub";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateSocialHubLocal", () => {
  it("returns the location social hub structure", () => {
    const out = generateSocialHubLocal({}, seededRng(5));
    expect(out.type).toBe("location");
    expect(out.content).toContain("### The Place");
    expect(out.content).toContain("### The Trouble");
    expect(out.lore).toContain("### At a Glance");
    expect(out.lore).toContain("### Entity Seeds");
    expect(out.labels).toContain("social-hub-generator");
  });

  it("honours explicit genre options and campaign context", () => {
    const out = generateSocialHubLocal(
      {
        genre: "Cyberpunk",
        venueType: "Noodle Bar",
        atmosphere: "Cold and professional",
        wealthLevel: "Prosperous (good drink, private rooms)",
        clientele: "Hackers and netrunners",
        campaignContext: "a district under corporate curfew",
      },
      seededRng(2),
    );
    expect(out.summary).toContain("noodle bar");
    expect(out.content).toContain("a district under corporate curfew");
    expect(out.lore).toContain("Noodle Bar");
    expect(out.lore).toContain("Cold and professional");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateSocialHubLocal({}, seededRng(9))).toEqual(
      generateSocialHubLocal({}, seededRng(9)),
    );
  });
});

describe("generateTavernLocal", () => {
  it("returns the tavern structure and labels", () => {
    const out = generateTavernLocal({}, seededRng(7));
    expect(out.type).toBe("location");
    expect(out.content).toContain("### The People");
    expect(out.lore).toContain("### Notable Patrons");
    expect(out.labels).toContain("tavern-generator");
  });

  it("honours explicit tavern options and campaign context", () => {
    const out = generateTavernLocal(
      {
        type: "Dockside Tavern",
        atmosphere: "Tense and suspicious",
        settlementType: "Coastal port",
        wealthLevel: "Poor (cheap but honest)",
        clientele: "Smugglers and fences",
        campaignContext: "a harbour locked down after a ghost ship arrived",
      },
      seededRng(3),
    );
    expect(out.summary).toContain("dockside tavern");
    expect(out.summary).toContain("coastal port");
    expect(out.content).toContain("ghost ship arrived");
    expect(out.lore).toContain("Dockside Tavern");
  });
});

describe("buildSocialHubPrompt", () => {
  it("embeds options, ban prompt, and session context", () => {
    const { systemInstruction, userMessage, resolved } = buildSocialHubPrompt(
      {
        genre: "Sci-Fi",
        venueType: "Spaceport Cantina",
        atmosphere: "Warm but secretive",
        clientele: "Spacers and pilots",
      },
      "- Existing: Port Kestrel (location)",
      seededRng(4),
    );
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("Port Kestrel");
    expect(userMessage).toContain("- Genre / Setting: Sci-Fi");
    expect(userMessage).toContain("- Venue Type: Spaceport Cantina");
    expect(resolved.venueType).toBe("Spaceport Cantina");
  });

  it("keeps the public config data", () => {
    expect(socialHubConfig.venueTypesByGenre.Cyberpunk).toContain("Noodle Bar");
    expect(socialHubConfig.settlementTypes).toContain("Coastal port");
  });
});

describe("buildTavernPrompt", () => {
  it("embeds tavern options, ban prompt, and session context", () => {
    const { systemInstruction, userMessage, resolved } = buildTavernPrompt(
      { type: "Roadside Alehouse", settlementType: "Market town" },
      "- Existing: The Old Road (route)",
      seededRng(6),
    );
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("The Old Road");
    expect(userMessage).toContain("- Type: Roadside Alehouse");
    expect(userMessage).toContain("- Settlement Type: Market town");
    expect(userMessage).toContain("- Naming Directive:");
    expect(resolved.tavernType).toBe("Roadside Alehouse");
  });
});

describe("parse social hub responses", () => {
  it("parses fenced JSON and preserves labels", () => {
    const out = parseSocialHubResponse(
      '```json\n{"title":"Dock 19","summary":"x","content":"### The Place","lore":"### At a Glance","labels":["custom"]}\n```',
    );
    expect(out.title).toBe("Dock 19");
    expect(out.labels).toContain("custom");
  });

  it("falls back to defaults and throws on invalid JSON", () => {
    expect(parseTavernResponse('{"content":"x","lore":"y"}').title).toBe(
      "The Unnamed Tavern",
    );
    expect(() => parseSocialHubResponse("nope")).toThrow();
  });
});
