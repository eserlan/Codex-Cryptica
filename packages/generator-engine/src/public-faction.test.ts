import { describe, it, expect } from "vitest";
import {
  buildFactionPrompt,
  parseFactionResponse,
  generateFactionLocal,
  buildVampirePrompt,
  parseVampireResponse,
  generateVampireLocal,
  buildDarkFactionPrompt,
  parseDarkFactionResponse,
  generateDarkFactionLocal,
  darkFactionConfig,
  factionConfig,
} from "./public-faction";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateFactionLocal", () => {
  it("returns the four content sections and lore structure", () => {
    const out = generateFactionLocal({}, seededRng(5));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### What they control");
    expect(out.content).toContain("### Why they are dangerous");
    expect(out.lore).toContain("### At a Glance");
    expect(out.lore).toContain("### Rival Faction");
    expect(out.labels).toContain("faction-generator");
  });

  it("honours explicit type/scope/alignment", () => {
    const out = generateFactionLocal(
      {
        type: "Temple Order",
        scope: "Single city",
        alignment: "Idealistic but compromised",
      },
      seededRng(2),
    );
    expect(out.summary).toContain("temple order");
    expect(out.summary).toContain("single city");
  });

  it("offers dedicated Cosmic Horror faction choices", () => {
    expect(factionConfig.themes).toContain("Cosmic Horror");
    expect(factionConfig.typesByTheme["Cosmic Horror"]).toContain(
      "Research Society",
    );
    expect(factionConfig.scopesByTheme["Cosmic Horror"]).toContain(
      "Remote coast or valley",
    );
    expect(factionConfig.goalsByTheme["Cosmic Horror"]).toContain(
      "Contain an anomaly long enough to learn whether it can be moved safely.",
    );
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateFactionLocal({}, seededRng(9))).toEqual(
      generateFactionLocal({}, seededRng(9)),
    );
  });
});

describe("buildFactionPrompt", () => {
  it("embeds theme voice, ban prompt, and session context", () => {
    const { systemInstruction, userMessage } = buildFactionPrompt(
      { theme: "Post-Apocalyptic", type: "Wasteland Cult" },
      "- Existing: The Dust Choir (faction)",
      seededRng(4),
    );
    expect(systemInstruction).toContain("post-apocalyptic survival");
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("- Existing: The Dust Choir (faction)");
    expect(userMessage).toContain("- Faction Type: Wasteland Cult");
    expect(userMessage).toContain("- Theme/Genre: Post-Apocalyptic");
  });

  it("defaults the theme to the first config theme", () => {
    const { resolved } = buildFactionPrompt({}, "", seededRng(1));
    expect(resolved.theme).toBe(factionConfig.themes[0]);
  });

  it("uses the Western / Frontier theme voice", () => {
    const { systemInstruction, userMessage } = buildFactionPrompt(
      { theme: "Western / Frontier" },
      "",
      seededRng(1),
    );
    expect(systemInstruction).toContain("weird west or classic frontier");
    expect(userMessage).toContain("- Theme/Genre: Western / Frontier");
  });
});

describe("parseFactionResponse", () => {
  const { resolved } = buildFactionPrompt({}, "", seededRng(3));
  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"The Writ","summary":"x","content":"### What they control\\ny","lore":"### At the Table","labels":["a"]}\n```';
    const out = parseFactionResponse(json, resolved);
    expect(out.title).toBe("The Writ");
    expect(out.content).toContain("What they control");
  });
  it("throws on invalid JSON", () => {
    expect(() => parseFactionResponse("nope", resolved)).toThrow();
  });
});

describe("vampire clan", () => {
  it("generateVampireLocal returns GM reference lore", () => {
    const out = generateVampireLocal({}, seededRng(7));
    expect(out.type).toBe("faction");
    expect(out.lore).toContain("### GM Reference Information");
    expect(out.lore).toContain("- **Faction Type**: Vampire Clan");
    expect(out.labels).toContain("vampire-clan");
  });

  it("buildVampirePrompt includes resolved options and ban prompt", () => {
    const { userMessage, resolved } = buildVampirePrompt(
      { archetype: "Occult Coven" },
      "",
      seededRng(6),
    );
    expect(userMessage).toContain("- Clan Archetype: Occult Coven");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(resolved.name.length).toBeGreaterThan(0);
  });

  it("parseVampireResponse falls back to the resolved name", () => {
    const { resolved } = buildVampirePrompt({}, "", seededRng(8));
    const out = parseVampireResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.name);
    expect(out.labels).toContain("vampire-clan");
  });
});

describe("dark fantasy faction (#1136)", () => {
  it("generateDarkFactionLocal returns the four content sections and lore structure", () => {
    const out = generateDarkFactionLocal({}, seededRng(11));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### What they control");
    expect(out.content).toContain("### Why they are dangerous");
    expect(out.lore).toContain("### At a Glance");
    expect(out.lore).toContain("### Rival Faction");
    expect(out.labels).toContain("dark-fantasy-faction");
    expect(out.labels).toContain("grimdark");
  });

  it("honours explicit mode/factionType/scope/moralPosture", () => {
    const out = generateDarkFactionLocal(
      {
        mode: "Plague City",
        factionType: "Plague Cult",
        scope: darkFactionConfig.scopes[0],
        moralPosture: darkFactionConfig.moralPostures[0],
      },
      seededRng(12),
    );
    expect(out.summary).toContain("plague cult");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateDarkFactionLocal({}, seededRng(13))).toEqual(
      generateDarkFactionLocal({}, seededRng(13)),
    );
  });

  it("buildDarkFactionPrompt includes resolved options and ban prompt", () => {
    const { systemInstruction, userMessage, resolved } = buildDarkFactionPrompt(
      { mode: "Witch-Hunt", factionType: "Witch-Hunter Lodge" },
      "- Existing: The Ashen Veil (faction)",
      seededRng(14),
    );
    expect(systemInstruction).toContain("grimdark worldbuilding");
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("- Existing: The Ashen Veil (faction)");
    expect(userMessage).toContain("- Dark Fantasy Mode: Witch-Hunt");
    expect(userMessage).toContain("- Faction Type: Witch-Hunter Lodge");
    expect(resolved.name.length).toBeGreaterThan(0);
  });

  it("parseDarkFactionResponse falls back to the resolved name and labels", () => {
    const { resolved } = buildDarkFactionPrompt({}, "", seededRng(15));
    const out = parseDarkFactionResponse(
      '{"content":"x","lore":"y"}',
      resolved,
    );
    expect(out.title).toBe(resolved.name);
    expect(out.labels).toContain("dark-fantasy-faction");
    expect(out.labels).toContain("grimdark");
  });

  it("throws on invalid JSON", () => {
    const { resolved } = buildDarkFactionPrompt({}, "", seededRng(16));
    expect(() => parseDarkFactionResponse("nope", resolved)).toThrow();
  });
});
