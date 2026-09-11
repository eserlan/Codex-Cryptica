import { describe, it, expect } from "vitest";
import {
  buildSettlementPrompt,
  parseSettlementResponse,
  generateSettlementLocal,
  settlementConfig,
} from "./public-settlement";
import { NAME_BAN_PROMPT } from "./public-npc";

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
