import { describe, expect, it } from "vitest";
import {
  buildNamesPrompt,
  generateNamesLocal,
  nameGeneratorConfig,
  parseNamesResponse,
} from "./public-names";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateNamesLocal", () => {
  it("maps name type to entity type", () => {
    expect(generateNamesLocal({ nameType: "Person" }).type).toBe("character");
    expect(generateNamesLocal({ nameType: "Place" }).type).toBe("location");
    expect(generateNamesLocal({ nameType: "Faction" }).type).toBe("faction");
    expect(generateNamesLocal({ nameType: "Item" }).type).toBe("item");
  });

  it("generates the requested count and clamps invalid count", () => {
    const three = generateNamesLocal({ count: "3" }, seededRng(5));
    expect(three.content.match(/^- /gm)).toHaveLength(3);

    const fallback = generateNamesLocal(
      { count: "not-a-number" },
      seededRng(5),
    );
    expect(fallback.content.match(/^- /gm)?.length).toBeGreaterThan(0);
  });

  it("uses culture-specific tables and is deterministic", () => {
    const first = generateNamesLocal(
      { culture: "Dwarven", count: "5" },
      seededRng(9),
    );
    const second = generateNamesLocal(
      { culture: "Dwarven", count: "5" },
      seededRng(9),
    );
    expect(first).toEqual(second);
    expect(first.content).toContain("Dwarven");
    expect(first.labels).toContain("name-generator");
  });
});

describe("buildNamesPrompt", () => {
  it("embeds options and the ban prompt", () => {
    const { systemInstruction, userMessage, resolved } = buildNamesPrompt({
      theme: "Cyberpunk / Corporate",
      culture: "High Elf",
      gender: "Neutral / Ambiguous",
      nameType: "Person",
      count: "3",
      context: "a moonlit court",
    });
    expect(systemInstruction).toContain("JSON format");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("Cyberpunk / Corporate");
    expect(userMessage).toContain("a moonlit court");
    expect(resolved.count).toBe(3);
  });

  it("keeps the public config data", () => {
    expect(nameGeneratorConfig.cultures).toContain("Dwarven");
    expect(nameGeneratorConfig.nameTypes).toContain("Faction");
  });
});

describe("parseNamesResponse", () => {
  const { resolved } = buildNamesPrompt({
    culture: "High Elf",
    nameType: "Person",
  });

  it("parses fenced JSON and preserves labels", () => {
    const out = parseNamesResponse(
      '```json\n{"content":"- **Sylvara**: x","lore":"Culture: High Elf","labels":["custom"]}\n```',
      resolved,
    );
    expect(out.type).toBe("character");
    expect(out.title).toBe("High Elf Names — Person");
    expect(out.content).toContain("Sylvara");
    expect(out.labels).toContain("custom");
  });

  it("falls back to labels and throws on invalid JSON", () => {
    expect(
      parseNamesResponse('{"content":"x","lore":"y"}', resolved).labels,
    ).toContain("name-generator");
    expect(() => parseNamesResponse("nope", resolved)).toThrow();
  });
});
