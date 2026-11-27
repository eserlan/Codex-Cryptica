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
    expect(out.summary).toBe(
      "An empire in the temperate highlands, ruled by a hereditary dynasty and close to boiling over.",
    );
    expect(out.lore).toContain(
      "### Campaign Context\na crumbling empire on the edge of civil war",
    );
    expect(out.content).not.toContain("crumbling empire");
    expect(out.lore).toContain("Common but regulated");
  });

  it("treats blank option values as unset instead of printing them", () => {
    const out = generateKingdomLocal(
      { polityType: "  ", scale: " ", magicLevel: "" },
      seededRng(8),
    );
    expect(out.summary).not.toMatch(/^An? {2}|^A in/);
    expect(out.lore).toContain("- **Scale**: Mid-sized nation");
    expect(out.lore).toContain("- **Magic Level**: Common but regulated");
    expect(kingdomConfig.polityTypes).toContain(
      out.lore.match(/\*\*Polity Type\*\*: (.*)/)?.[1],
    );
  });

  it("leaves out the Campaign Context section when no context is given", () => {
    const out = generateKingdomLocal({ campaignContext: "   " }, seededRng(2));
    expect(out.lore).not.toContain("### Campaign Context");
  });

  it("keys the ruler, power line and summary to the Government style", () => {
    const drafts = kingdomConfig.governmentStyles.map((governmentStyle) =>
      generateKingdomLocal({ governmentStyle }, seededRng(3)),
    );
    const rulerLines = drafts.map(
      (d) => d.lore.match(/\*\*Ruler\*\*: .*/)?.[0],
    );
    expect(
      new Set(rulerLines.map((l) => l?.split(", ").slice(1).join(", "))),
    ).toHaveProperty("size", kingdomConfig.governmentStyles.length);
    expect(drafts[1].summary).toContain("ruled by an elected council");
    expect(drafts[6].summary).toContain("ruled by a council of clan elders");
    for (const draft of drafts) {
      expect(draft.content).not.toContain("leads through a system of");
    }
  });

  it("keys the setting, capital, resource and one rumour to the Geography", () => {
    const drafts = kingdomConfig.geographies.map((geography) =>
      generateKingdomLocal({ geography }, seededRng(4)),
    );
    const capitals = drafts.map(
      (d) => d.lore.match(/\*\*Capital\*\*: [^,]+, (.*)/)?.[1],
    );
    expect(new Set(capitals).size).toBe(kingdomConfig.geographies.length);
    expect(drafts[1].lore).toContain(
      "Controls the harbours and the grain ships",
    );
    expect(drafts[5].summary).toContain("in an island archipelago");
    for (const draft of drafts) expect(draft.content).not.toContain("terrain");
  });

  it("keys the society line and the opposition to the Conflict level", () => {
    const drafts = kingdomConfig.conflictLevels.map((conflictLevel) =>
      generateKingdomLocal({ conflictLevel }, seededRng(5)),
    );
    const society = drafts.map(
      (d) => d.content.split("### Society & Culture\n")[1]?.split("\n")[0],
    );
    expect(new Set(society).size).toBe(kingdomConfig.conflictLevels.length);
    expect(drafts[0].summary).toContain("and at peace for now.");
    expect(drafts[3].summary).toContain("and fighting a total war.");
    for (const draft of drafts) {
      expect(draft.content).not.toMatch(/\bat (?:at|open|total|post-war)\b/i);
    }
  });

  it("gives each Magic level its own line and each Scale its own territory", () => {
    const magic = kingdomConfig.magicLevels.map(
      (magicLevel) =>
        generateKingdomLocal({ magicLevel }, seededRng(6)).content.split(
          "\n",
        )[4],
    );
    expect(new Set(magic).size).toBe(kingdomConfig.magicLevels.length);
    const realms = kingdomConfig.scales.map(
      (scale) =>
        generateKingdomLocal({ scale }, seededRng(6)).content.split("\n")[1],
    );
    expect(new Set(realms).size).toBe(kingdomConfig.scales.length);
    expect(realms[0]).toContain("The city itself,");
    expect(realms[2]).toContain("Its capital,");
    expect(realms.join(" ")).not.toMatch(/nation kingdom|\(many provinces\)/);
  });

  it("keeps typed-in custom values in readable prose", () => {
    const out = generateKingdomLocal(
      {
        polityType: "Sky Barony",
        governmentStyle: "Rule by lottery",
        geography: "Floating isles",
        scale: "Two valleys",
        conflictLevel: "Cold war",
        magicLevel: "Outlawed",
      },
      seededRng(7),
    );
    expect(out.summary).toBe(
      "A sky barony in floating isles, ruled by a system of rule by lottery and facing cold war.",
    );
    expect(out.content).toContain("territory on the scale of two valleys");
    expect(out.content).toContain("Magic in the realm is outlawed");
    expect(out.content).toContain("The realm is living through cold war");
    expect(out.lore).toContain(
      "Controls the routes through the floating isles",
    );
    expect(out.lore).toContain("**Polity Type**: Sky Barony");
  });

  it("ties the hook, rumours and event seed to the hidden problem", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const out = generateKingdomLocal({}, seededRng(seed));
      expect(out.lore).not.toContain("Crisis behind");
      expect(out.lore).not.toContain(
        "A royal messenger arrived three days ago",
      );
      expect(out.lore).toMatch(/- \*\*📅 The [^*]+\*\*: /);
      expect(
        [out.title, out.summary, out.content, out.lore].join(" "),
      ).not.toMatch(/[–—]/);
      expect(out.content).not.toMatch(/[a-z] The [A-Z]/);
    }
  });

  it("never gives the ruler and the two factions the same name", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const lore = generateKingdomLocal({}, seededRng(seed)).lore;
      const ruler = lore.match(/\*\*Ruler\*\*: (\w+),/)?.[1];
      const factions = [...lore.matchAll(/^- \*\*The (\w+) \w+\*\*: /gm)].map(
        (m) => m[1],
      );
      expect(factions).toHaveLength(2);
      expect(new Set([ruler, ...factions]).size).toBe(3);
    }
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
