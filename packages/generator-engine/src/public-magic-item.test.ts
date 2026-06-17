import { describe, it, expect } from "vitest";
import {
  buildMagicItemPrompt,
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
