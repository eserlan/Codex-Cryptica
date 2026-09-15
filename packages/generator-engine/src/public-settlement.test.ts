import { describe, it, expect } from "vitest";
import {
  buildSettlementPrompt,
  parseSettlementResponse,
  generateSettlementLocal,
  settlementConfig,
} from "./public-settlement";
import { NAME_BAN_PROMPT } from "./public-npc";
import { BANNED_NAMES } from "./public-npc-constants";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateSettlementLocal", () => {
  it("returns the location type with structured content sections", () => {
    const out = generateSettlementLocal({}, seededRng(5));
    expect(out.type).toBe("location");
    expect(out.content).toContain("## Core Concept");
    expect(out.content).toContain("## First Impression");
    expect(out.content).toContain("## Inhabitants");
    expect(out.content).toContain("## Life Here");
    expect(out.content).toContain("## History");
    expect(out.lore).toContain("### Current Tension");
    expect(out.lore).toContain("### Points of Interest");
    expect(out.lore).toContain("### Notable Inhabitants");
    expect(out.lore).toContain("### Controlling / Important Factions");
    expect(out.lore).toContain("### Adventure Hooks");
    expect(out.lore).toContain("### GM Reference Information");
    expect(out.labels).toContain("rpg-location");
  });

  it("honours an explicit size and its points-of-interest count", () => {
    const out = generateSettlementLocal({ size: "Hamlet" }, seededRng(2));
    expect(out.lore).toContain("- **Scale**: Hamlet");
    const poiLines = out.lore.split("\n").filter((l) => l.startsWith("- **📍"));
    expect(poiLines).toHaveLength(3);
  });

  it("honours explicit primaryFunction", () => {
    const out = generateSettlementLocal(
      { primaryFunction: "Pilgrimage town" },
      seededRng(3),
    );
    expect(out.lore).toContain("- **Primary Function**: Pilgrimage town");
    // The raw primaryFunction is a conceptual role, not mandatory prose, so
    // the narrative text uses a scale-appropriate phrase for it instead of
    // repeating the literal option string verbatim (#2536).
    expect(out.content).toContain("temple town");
  });

  it("falls back to economy as primaryFunction for backwards compat", () => {
    const out = generateSettlementLocal({ economy: "Mining" }, seededRng(3));
    expect(out.lore).toContain("- **Primary Function**: Mining");
  });

  it("uses genre-keyed vocabulary for cyberpunk", () => {
    const out = generateSettlementLocal(
      { genre: "Cyberpunk", size: "District" },
      seededRng(7),
    );
    expect(out.lore).toContain("- **Genre / Setting**: Cyberpunk");
    expect(out.lore).toContain("- **Scale**: District");
  });

  it("uses genre-keyed vocabulary for sci-fi", () => {
    const out = generateSettlementLocal(
      { genre: "Sci-Fi", size: "Station" },
      seededRng(7),
    );
    expect(out.lore).toContain("- **Genre / Setting**: Sci-Fi");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateSettlementLocal({}, seededRng(9))).toEqual(
      generateSettlementLocal({}, seededRng(9)),
    );
  });

  it("includes mainTension in lore and adventure hooks", () => {
    const out = generateSettlementLocal(
      { mainTension: "Succession crisis" },
      seededRng(4),
    );
    expect(out.lore).toContain("Succession crisis");
    expect(out.lore).toContain("succession crisis");
  });
});

describe("settlementConfig", () => {
  it("has genre-keyed size pools", () => {
    expect(settlementConfig.sizesByGenre["Fantasy"]).toHaveLength(4);
    expect(settlementConfig.sizesByGenre["Cyberpunk"]).toHaveLength(4);
    expect(settlementConfig.sizesByGenre["Sci-Fi"]).toHaveLength(4);
    expect(settlementConfig.sizesByGenre["Post-Apocalyptic"]).toHaveLength(4);
  });

  it("legacy sizes getter returns Fantasy sizes", () => {
    expect(settlementConfig.sizes).toEqual(
      settlementConfig.sizesByGenre["Fantasy"],
    );
  });

  it("has all genre pools for every keyed property", () => {
    for (const genre of settlementConfig.genres) {
      expect(settlementConfig.sizesByGenre[genre]).toBeDefined();
      expect(settlementConfig.environmentsByGenre[genre]).toBeDefined();
      expect(settlementConfig.primaryFunctionsByGenre[genre]).toBeDefined();
      expect(settlementConfig.tonesByGenre[genre]).toBeDefined();
      expect(settlementConfig.mainTensionsByGenre[genre]).toBeDefined();
      expect(settlementConfig.authorityTypesByGenre[genre]).toBeDefined();
      expect(settlementConfig.notableLocationsByGenre[genre]).toBeDefined();
      expect(settlementConfig.factionsByGenre[genre]).toBeDefined();
      expect(settlementConfig.namePrefixesByGenre[genre]).toBeDefined();
      expect(settlementConfig.nameSuffixesByGenre[genre]).toBeDefined();
    }
  });
});

describe("Superhero / Comic Book genre (#3104)", () => {
  const GENRE = "Superhero / Comic Book";

  it("is registered as a settlement genre", () => {
    expect(settlementConfig.genres).toContain(GENRE);
  });

  it("has reasonably sized, genre-specific option pools rather than a 1-2 item stub", () => {
    expect(settlementConfig.sizesByGenre[GENRE].length).toBeGreaterThanOrEqual(
      4,
    );
    expect(
      settlementConfig.environmentsByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      settlementConfig.primaryFunctionsByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(5);
    expect(settlementConfig.tonesByGenre[GENRE].length).toBeGreaterThanOrEqual(
      4,
    );
    expect(
      settlementConfig.mainTensionsByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      settlementConfig.authorityTypesByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      settlementConfig.notableLocationsByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(6);
    expect(
      settlementConfig.factionsByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      settlementConfig.namePrefixesByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      settlementConfig.nameSuffixesByGenre[GENRE].length,
    ).toBeGreaterThanOrEqual(4);
    expect(INHABITANT_NAMES_BY_GENRE[GENRE].length).toBeGreaterThanOrEqual(8);
  });

  it("does not fall back to the shared Fantasy default (content is genuinely genre-specific)", () => {
    expect(settlementConfig.sizesByGenre[GENRE]).not.toEqual(
      settlementConfig.sizesByGenre["Fantasy"],
    );
    expect(settlementConfig.environmentsByGenre[GENRE]).not.toEqual(
      settlementConfig.environmentsByGenre["Fantasy"],
    );
    expect(settlementConfig.primaryFunctionsByGenre[GENRE]).not.toEqual(
      settlementConfig.primaryFunctionsByGenre["Fantasy"],
    );
    expect(settlementConfig.factionsByGenre[GENRE]).not.toEqual(
      settlementConfig.factionsByGenre["Fantasy"],
    );
  });

  it("produces output naming supers, superhuman incidents, and public sentiment", () => {
    const out = generateSettlementLocal({ genre: GENRE }, seededRng(11));
    expect(out.lore).toContain(GENRE);
    const combined = `${out.content} ${out.lore}`;
    // Superhero-specific vocabulary should show up somewhere in the generated
    // text — either the resolved axes themselves or the derived content that
    // is built from their traits (occupations, POI blurbs, hooks, etc.).
    const superheroSignals = [
      "hero",
      "villain",
      "metahuman",
      "superhuman",
      "power",
      "registry",
      "containment",
      "vigilante",
    ];
    const lowerCombined = combined.toLowerCase();
    expect(superheroSignals.some((term) => lowerCombined.includes(term))).toBe(
      true,
    );
  });

  it("reads distinctly different from a Fantasy settlement generated with the same seed", () => {
    const superhero = generateSettlementLocal({ genre: GENRE }, seededRng(3));
    const fantasy = generateSettlementLocal({ genre: "Fantasy" }, seededRng(3));
    expect(superhero.content).not.toEqual(fantasy.content);
    expect(superhero.lore).not.toEqual(fantasy.lore);
    expect(superhero.lore).toContain(GENRE);
    expect(fantasy.lore).not.toContain(GENRE);
  });

  it("has crash-safe fallbacks: an unrecognised genre still resolves via the Fantasy default", () => {
    expect(() =>
      generateSettlementLocal({ genre: "Not A Real Genre" }, seededRng(7)),
    ).not.toThrow();
  });

  it("has no invented proper nouns colliding with BANNED_NAMES (case-insensitive, whole word)", () => {
    const haystacks = [
      ...settlementConfig.notableLocationsByGenre[GENRE],
      ...settlementConfig.factionsByGenre[GENRE],
      ...settlementConfig.namePrefixesByGenre[GENRE],
      ...settlementConfig.nameSuffixesByGenre[GENRE],
      ...INHABITANT_NAMES_BY_GENRE[GENRE],
    ];
    for (const banned of BANNED_NAMES) {
      const bannedRegex = new RegExp(`\\b${banned}\\b`, "i");
      for (const text of haystacks) {
        expect(
          bannedRegex.test(text),
          `"${text}" collides with banned name "${banned}"`,
        ).toBe(false);
      }
    }
  });
});

describe("buildSettlementPrompt", () => {
  it("embeds scale, genre, function, tension, ban prompt, and session context", () => {
    const { userMessage, resolved } = buildSettlementPrompt(
      {
        genre: "Cyberpunk",
        size: "District",
        primaryFunction: "Corporate logistics hub",
      },
      "- Existing: Axiom Tower (location)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Genre / Setting: Cyberpunk");
    expect(userMessage).toContain("- Scale: District");
    expect(userMessage).toContain(
      "- Primary Function: Corporate logistics hub",
    );
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("- Existing: Axiom Tower (location)");
    expect(resolved.genre).toBe("Cyberpunk");
  });

  it("includes the four guiding questions", () => {
    const { userMessage } = buildSettlementPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("Why does this place exist");
    expect(userMessage).toContain("What is everyday life like here");
    expect(userMessage).toContain("Who lives here");
    expect(userMessage).toContain("What is happening here right now");
  });

  it("includes anti-monoculture guidance against common LLM defaults", () => {
    const { userMessage } = buildSettlementPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("hidden ledgers");
    expect(userMessage).toContain("existed before the PCs arrived");
  });

  it("includes scale-honesty, causal-chain, and cross-section reuse guidance", () => {
    const { userMessage } = buildSettlementPrompt({}, "", seededRng(1));
    expect(userMessage).toContain("conceptual role for the Primary Function");
    expect(userMessage).toContain("causal chain");
    expect(userMessage).toContain(
      "Reuse named people and places across sections",
    );
  });

  it("defaults to Fantasy genre", () => {
    const { resolved } = buildSettlementPrompt({}, "", seededRng(2));
    expect(resolved.genre).toBe("Fantasy");
  });
});

describe("parseSettlementResponse", () => {
  const { resolved } = buildSettlementPrompt({}, "", seededRng(1));

  it("parses fenced JSON", () => {
    const json =
      '```json\n{"title":"Saltmere","content":"## Core Concept\\nx","lore":"### GM Reference Information","labels":["rpg-location"]}\n```';
    const out = parseSettlementResponse(json, resolved);
    expect(out.title).toBe("Saltmere");
    expect(out.content).toContain("Core Concept");
  });

  it("falls back to the resolved name when title is missing", () => {
    const out = parseSettlementResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.name);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseSettlementResponse("nope", resolved)).toThrow();
  });
});

describe("generateSettlementLocal — scale-aware prose (#2536 refinement)", () => {
  it("never describes a hamlet with a city-scale word", () => {
    const rng = seededRng(13);
    for (let i = 0; i < 60; i++) {
      const out = generateSettlementLocal(
        { genre: "Fantasy", size: "Hamlet" },
        rng,
      );
      const prose = out.content.split("## History")[0].toLowerCase();
      expect(prose).not.toMatch(/\bcity\b/);
      expect(prose).not.toMatch(/\buniversity district\b/);
    }
  });

  it("gives a hamlet-scale academic settlement an institutional-footprint note", () => {
    const out = generateSettlementLocal(
      { genre: "Fantasy", size: "Hamlet", primaryFunction: "Academic city" },
      seededRng(11),
    );
    expect(out.content).toContain("At this size, that means");
  });

  it("names an inhabitant in Current Tension when one exists, and that inhabitant appears in Notable Inhabitants", () => {
    const rng = seededRng(17);
    for (let i = 0; i < 30; i++) {
      const out = generateSettlementLocal({ genre: "Fantasy" }, rng);
      const tensionParagraph = out.lore.split("### Points of Interest")[0];
      const notableSection = out.lore.split("### Notable Inhabitants")[1];
      const nameMatch = tensionParagraph.match(/\b([A-Z][a-z]+),/);
      if (nameMatch) {
        expect(notableSection).toContain(`**${nameMatch[1]}**`);
      }
    }
  });

  it("sometimes has Life Here reference an actual point of interest by name", () => {
    const rng = seededRng(19);
    let sawReference = false;
    for (let i = 0; i < 40; i++) {
      const out = generateSettlementLocal({ genre: "Fantasy" }, rng);
      if (out.content.includes("Residents gather at")) {
        sawReference = true;
        break;
      }
    }
    expect(sawReference).toBe(true);
  });
});
