import { describe, it, expect } from "vitest";
import {
  buildMagicItemPrompt,
  magicItemConfig,
  parseMagicItemResponse,
  generateMagicItemLocal,
} from "./public-magic-item";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateMagicItemLocal", () => {
  it("returns the item lore structure", () => {
    const out = generateMagicItemLocal({}, seededRng(5));
    expect(out.type).toBe("item");
    expect(out.content).toContain("### Description");
    expect(out.lore).toContain("### GM Reference Information");
    expect(out.lore).toContain("### Magical Properties");
    expect(out.lore).toContain("### Lore & History");
    expect(out.labels).toContain("rpg-item");
  });

  it("honours explicit type and rarity, embedding type in the name", () => {
    const out = generateMagicItemLocal(
      { type: "Wand", rarity: "Legendary" },
      seededRng(2),
    );
    expect(out.lore).toContain("- **Type**: Wand");
    expect(out.lore).toContain("- **Rarity**: Legendary");
    expect(out.title).toContain("(Wand)");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateMagicItemLocal({}, seededRng(9))).toEqual(
      generateMagicItemLocal({}, seededRng(9)),
    );
  });
});

describe("generateMagicItemLocal copy and theme", () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

  it("uses 'an' before a vowel-initial type", () => {
    const contents = seeds.map(
      (seed) =>
        generateMagicItemLocal({ type: "Amulet" }, seededRng(seed)).content,
    );
    expect(contents.some((c) => /\ban amulet\b/.test(c))).toBe(true);
    expect(contents.some((c) => /\ba amulet\b/i.test(c))).toBe(false);
  });

  it("uses 'a' before a consonant-initial type", () => {
    const contents = seeds.map(
      (seed) =>
        generateMagicItemLocal({ type: "Wand" }, seededRng(seed)).content,
    );
    expect(contents.some((c) => /\ba wand\b/.test(c))).toBe(true);
    expect(contents.some((c) => /\ban wand\b/i.test(c))).toBe(false);
  });

  it("writes the campaign context into the GM notes when provided", () => {
    const out = generateMagicItemLocal(
      { campaignContext: "  The Ash Court of Veyra  " },
      seededRng(3),
    );
    expect(out.lore).toContain("### Campaign Context\nThe Ash Court of Veyra");
  });

  it("omits the campaign section when the context is blank", () => {
    const out = generateMagicItemLocal(
      { campaignContext: "   " },
      seededRng(3),
    );
    expect(out.lore).not.toContain("### Campaign Context");
  });

  it("uses the chosen theme's effects and histories", () => {
    const out = generateMagicItemLocal(
      { theme: "Cyberpunk / Corporate" },
      seededRng(7),
    );
    expect(out.lore).toContain("- **Theme**: Cyberpunk / Corporate");
    const themed = magicItemConfig.propertiesByTheme["Cyberpunk / Corporate"];
    const classic = magicItemConfig.propertiesByTheme["Classic Fantasy"];
    expect(themed.some((effect) => out.lore.includes(effect))).toBe(true);
    expect(classic.some((effect) => out.lore.includes(effect))).toBe(false);
  });

  it("falls back to Classic Fantasy for an unknown theme", () => {
    const out = generateMagicItemLocal({ theme: "Not A Theme" }, seededRng(7));
    expect(out.lore).toContain("- **Theme**: Classic Fantasy");
  });
});

describe("buildMagicItemPrompt", () => {
  it("embeds type, rarity, ban prompt and session context", () => {
    const { userMessage, resolved } = buildMagicItemPrompt(
      { type: "Ring", rarity: "Rare" },
      "- Existing: The Sunken Crown (item)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Type: Ring");
    expect(userMessage).toContain("- Rarity: Rare");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("- Existing: The Sunken Crown (item)");
    expect(resolved.name).toContain("(Ring)");
  });
});

describe("parseMagicItemResponse", () => {
  const { resolved } = buildMagicItemPrompt({}, "", seededRng(1));
  it("parses fenced JSON", () => {
    const json =
      '```json\n{"title":"Frostward","content":"### Description\\nx","lore":"### GM Reference Information","labels":["rpg-item"]}\n```';
    const out = parseMagicItemResponse(json, resolved);
    expect(out.title).toBe("Frostward");
    expect(out.content).toContain("Description");
  });
  it("falls back to resolved name and throws on bad JSON", () => {
    const out = parseMagicItemResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.name);
    expect(() => parseMagicItemResponse("nope", resolved)).toThrow();
  });
});
