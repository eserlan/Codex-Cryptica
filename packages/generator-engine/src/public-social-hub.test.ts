import { describe, expect, it } from "vitest";
import {
  buildSocialHubPrompt,
  buildTavernPrompt,
  generateSocialHubLocal,
  generateTavernLocal,
  parseSocialHubResponse,
  parseTavernResponse,
} from "./public-social-hub";
import { socialHubConfig } from "./public-social-hub-config";
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
    expect(out.content).not.toContain("ghost ship arrived");
    expect(out.lore).toContain(
      "### Campaign Context\na harbour locked down after a ghost ship arrived",
    );
    expect(out.lore).toContain("Dockside Tavern");
  });

  it("omits the campaign section when the context is blank", () => {
    const out = generateTavernLocal({ campaignContext: "   " }, seededRng(3));
    expect(out.lore).not.toContain("### Campaign Context");
    expect(out.content).not.toContain("main conflict");
  });

  it("chooses a or an from the word that follows", () => {
    const vowels = generateTavernLocal(
      {
        type: "Adventurer Lodge",
        atmosphere: "Eerie and hushed",
        settlementType: "Island monastery",
      },
      seededRng(4),
    );
    expect(vowels.summary).toMatch(/^An eerie and hushed adventurer lodge /);
    expect(vowels.summary).toContain("in an island monastery.");
    expect(vowels.content).toContain("is an adventurer lodge in an island");

    const consonants = generateTavernLocal(
      {
        type: "Guildhall",
        atmosphere: "Rowdy and welcoming",
        settlementType: "Market town",
      },
      seededRng(4),
    );
    expect(consonants.summary).toMatch(/^A rowdy and welcoming guildhall /);
    expect(consonants.content).toContain("is a guildhall in a market town");
  });

  it("writes Tavern / Inn as 'tavern and inn' in prose", () => {
    const out = generateTavernLocal({ type: "Tavern / Inn" }, seededRng(2));
    expect(out.summary).toContain("tavern and inn");
    expect(out.content).not.toContain("tavern / inn");
    expect(out.lore).toContain("**Type**: Tavern / Inn");
  });

  it("lets wealth level, clientele, atmosphere and settlement change the GM notes", () => {
    const poor = generateTavernLocal(
      {
        atmosphere: "Rowdy and welcoming",
        wealthLevel: "Destitute (dirt floors, watered-down drinks)",
        clientele: "Soldiers and mercenaries",
        settlementType: "Frontier outpost",
      },
      seededRng(6),
    );
    const rich = generateTavernLocal(
      {
        atmosphere: "Cold and professional",
        wealthLevel: "Wealthy (exclusive clientele)",
        clientele: "Merchants and traders",
        settlementType: "Capital city",
      },
      seededRng(6),
    );
    expect(poor.lore).toContain("Thin barley beer");
    expect(poor.content).toContain("packed dirt");
    expect(poor.lore).toContain("one-handed sergeant");
    expect(poor.lore).toContain("quick to break up a fight");
    expect(poor.lore).toContain("one rider short");
    expect(rich.lore).toContain("Amber brandy");
    expect(rich.content).toContain("A doorman decides who gets in");
    expect(rich.lore).toContain("wool trader");
    expect(rich.lore).toContain("impossible to read");
    expect(rich.lore).toContain("palace clerk");
    expect(rich.lore).not.toContain("Thin barley beer");
  });

  it("keeps typed-in custom values for every dropdown", () => {
    const out = generateTavernLocal(
      {
        type: "Floating barge inn",
        atmosphere: "Smoky and conspiratorial",
        settlementType: "Swamp hamlet",
        wealthLevel: "Ostentatious",
        clientele: "River pilots",
      },
      seededRng(8),
    );
    expect(out.summary).toBe(
      "A smoky and conspiratorial floating barge inn serving river pilots in a swamp hamlet.",
    );
    expect(out.content).toContain("The wealth level is ostentatious");
    expect(out.lore).toContain("priced for an ostentatious house");
    expect(out.lore).toContain("the river pilots crowd");
    expect(out.lore).toContain("smoky and conspiratorial mood");
    expect(out.lore).toContain("this swamp hamlet");
  });

  it("never gives the owner and both patrons the same name", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const out = generateTavernLocal({}, seededRng(seed));
      const owner = /\*\*Owner\*\*: (\w+)/.exec(out.lore)?.[1];
      const patronSection = out.lore.split("### Notable Patrons")[1] ?? "";
      const patronLines = patronSection.split("### Rumours")[0];
      const patrons = [...patronLines.matchAll(/^- \*\*(\w+)\*\*: /gm)].map(
        (match) => match[1],
      );
      expect(patrons).toHaveLength(2);
      expect(new Set([owner, ...patrons]).size).toBe(3);
    }
  });

  it("keeps owner and patron names distinct when the random source repeats", () => {
    const out = generateTavernLocal({}, () => 0);
    const owner = /\*\*Owner\*\*: ([^,]+)/.exec(out.lore)?.[1];
    const patronSection = out.lore.split("### Notable Patrons")[1] ?? "";
    const patronLines = patronSection.split("### Rumours")[0];
    const patrons = [...patronLines.matchAll(/^- \*\*([^*]+)\*\*: /gm)].map(
      (match) => match[1],
    );
    expect(patrons).toHaveLength(2);
    expect(new Set([owner, ...patrons]).size).toBe(3);
  });

  it("writes no en or em dashes and no stock faction seed", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const out = generateTavernLocal({}, seededRng(seed));
      const text = [out.summary, out.content, out.lore].join("\n");
      expect(text).not.toMatch(/[–—]/);
      expect(out.lore).not.toContain("Faction behind");
    }
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
    expect(socialHubConfig.venueTypesByGenre["Cosmic Horror"]).toContain(
      "Restricted Reading Room",
    );
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

// Superhero / Comic Book genre content (#3125): socialHubConfig used to have
// no entry for this genre, so random-idea.ts's themeToHubGenre mapping fell
// back to "Modern" (#3108). It now has real venue types and clientele of
// its own.
describe("Superhero / Comic Book genre (#3125)", () => {
  it("has its own venue and clientele pools, not the Fantasy fallback", () => {
    expect(socialHubConfig.genres).toContain("Superhero / Comic Book");
    expect(
      socialHubConfig.venueTypesByGenre["Superhero / Comic Book"],
    ).toContain("Hero-Team HQ Commissary");
    expect(
      socialHubConfig.clientelesByGenre["Superhero / Comic Book"],
    ).toContain("Off-duty heroes and sidekicks");

    const out = generateSocialHubLocal(
      { genre: "Superhero / Comic Book" },
      seededRng(9),
    );
    expect(out.type).toBe("location");
    expect(out.content).toBeTruthy();
  });
});
