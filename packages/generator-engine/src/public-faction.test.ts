import { describe, it, expect } from "vitest";
import {
  buildFactionPrompt,
  parseFactionResponse,
  generateFactionLocal,
  buildVampirePrompt,
  parseVampireResponse,
  generateVampireLocal,
  factionConfig,
} from "./public-faction";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe("generateFactionLocal", () => {
  it("returns the four content sections and lore structure", () => {
    const out = generateFactionLocal({}, seededRng(5));
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### What they control");
    expect(out.content).toContain("### Why they are dangerous");
    expect(out.lore).toContain("### At the Table");
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
