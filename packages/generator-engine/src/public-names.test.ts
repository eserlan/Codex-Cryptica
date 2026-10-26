import { describe, expect, it } from "vitest";
import {
  buildNamesPrompt,
  generateNamesLocal,
  nameGeneratorConfig,
  parseNamesResponse,
  rollNames,
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

  it("supports Pirate culture and style alternatives", () => {
    const pirateStyles = nameGeneratorConfig.culturesByTheme.Pirate;

    expect(pirateStyles).toHaveLength(10);
    expect(pirateStyles).toContain("Sailor's Nickname");
    expect(pirateStyles).toContain("Free-Port Mixed");

    for (const style of pirateStyles) {
      expect(nameGeneratorConfig.culturePrefixes[style]).toHaveLength(12);
      expect(nameGeneratorConfig.cultureSuffixes[style]).toHaveLength(12);
    }

    const output = generateNamesLocal(
      { theme: "Pirate", culture: "Dockside Trade Name", count: "3" },
      seededRng(12),
    );
    expect(output.content).toContain("Dockside Trade Name");
    expect(output.content).toContain("Anchor");
  });

  it("uses dedicated Cosmic Horror cultures instead of a generic fallback", () => {
    const styles = nameGeneratorConfig.culturesByTheme["Cosmic Horror"];

    expect(styles).toEqual([
      "Academic Register",
      "Coastal Family Name",
      "Dream Fragment",
      "Expedition Call Sign",
      "Archive Catalogue",
    ]);
    for (const style of styles) {
      expect(nameGeneratorConfig.culturePrefixes[style]).toHaveLength(12);
      expect(nameGeneratorConfig.cultureSuffixes[style]).toHaveLength(12);
    }

    const output = generateNamesLocal(
      { theme: "Cosmic Horror", culture: "Archive Catalogue", count: "3" },
      seededRng(12),
    );
    expect(output.content).toContain("Archive Catalogue");
    expect(output.content).not.toContain("Generic Fantasy");
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
    expect(nameGeneratorConfig.cultures).toContain("Privateer Alias");
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

describe("rollNames", () => {
  it("rolls a distinct, capitalised batch of the requested size", () => {
    const names = rollNames({ culture: "High Elf", count: "10" }, seededRng(3));

    expect(names).toHaveLength(10);
    expect(new Set(names).size).toBe(10);
    for (const name of names) expect(name).toMatch(/^[A-Z]/);
  });

  it("matches the names in the local write-up for the same seed", () => {
    const names = rollNames({ count: "4" }, seededRng(21));
    const output = generateNamesLocal({ count: "4" }, seededRng(21));

    for (const name of names) expect(output.content).toContain(`**${name}**`);
  });

  it("still fills the batch when the tables cannot supply enough unique names", () => {
    const constant = () => 0;

    expect(rollNames({ count: "3" }, constant)).toHaveLength(3);
  });

  it("falls back to the generic tables for an unknown culture", () => {
    const custom = rollNames({ culture: "Made-up", count: "5" }, seededRng(8));
    const generic = rollNames(
      { culture: "Generic Fantasy", count: "5" },
      seededRng(8),
    );

    expect(custom).toEqual(generic);
  });
});

describe("rollNames follows the name type for fantasy cultures", () => {
  const roll = (options: Record<string, string>, seed = 11) =>
    rollNames({ count: "10", ...options }, seededRng(seed));

  it("gives people a first name and a surname", () => {
    for (const name of roll({ culture: "Dwarven", nameType: "Person" }))
      expect(name).toMatch(/^\S+ \S+$/);
  });

  it("drops the surname when only first names are asked for", () => {
    for (const name of roll({
      culture: "Dwarven",
      nameType: "Person",
      parts: "first",
    }))
      expect(name).not.toContain(" ");
  });

  it("uses the gender for Norse patronymics", () => {
    const feminine = roll({
      culture: "Norse / Viking",
      nameType: "Person",
      gender: "Feminine",
    });
    const masculine = roll({
      culture: "Norse / Viking",
      nameType: "Person",
      gender: "Masculine",
    });

    for (const name of feminine) expect(name).toMatch(/dottir$/);
    for (const name of masculine) expect(name).toMatch(/son$/);
  });

  it("builds places from a place word, not a person's name", () => {
    for (const name of roll({ culture: "High Elf", nameType: "Place" }))
      expect(name).toMatch(
        /(mere|hold|ford|wick|reach|vale|haven|fell|march|crest|moor|barrow)( \w+)?$/,
      );
  });

  it("names factions as groups and items as objects", () => {
    for (const name of roll({ nameType: "Faction" }))
      expect(name).toMatch(/^The \w+ \S+$|^\S+ of the \w+ \w+$/);
    for (const name of roll({ nameType: "Item" }))
      expect(name).toMatch(/^The \w+ \w+$|^\w+'s \w+$/);
  });

  it("gives a typed-in culture the generic patterns", () => {
    for (const name of roll({ culture: "Assyrian", nameType: "Person" }))
      expect(name).toContain(" ");
  });

  it("keeps other genres' presets as single generated names", () => {
    for (const name of roll({
      culture: "Sailor's Nickname",
      nameType: "Person",
    }))
      expect(name).not.toContain(" ");
  });

  it("uses no first-name ending more than twice in a batch", () => {
    const names = roll({ nameType: "Person", parts: "first" }, 2);
    const endings = names.map((name) =>
      nameGeneratorConfig.cultureSuffixes["Generic Fantasy"].find((suffix) =>
        name.endsWith(suffix),
      ),
    );
    for (const ending of new Set(endings))
      expect(endings.filter((e) => e === ending).length).toBeLessThanOrEqual(2);
  });
});
