import { describe, expect, it } from "vitest";
import {
  buildScreamsheetPrompt,
  generateScreamsheetLocal,
  parseScreamsheetResponse,
  screamsheetConfig,
} from "./public-screamsheet";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("screamsheetConfig", () => {
  it("provides publication types for every genre", () => {
    for (const genre of screamsheetConfig.genres) {
      expect(
        screamsheetConfig.publicationTypesByGenre[genre]?.length,
      ).toBeGreaterThan(0);
    }
  });
});

describe("generateScreamsheetLocal", () => {
  it("returns the note handout structure with player and GM halves", () => {
    const out = generateScreamsheetLocal({}, seededRng(5));
    expect(out.type).toBe("note");
    expect(out.content).toContain("### Notices & Classifieds");
    expect(out.content).toContain("### Word on the Street");
    expect(out.content).toContain("### A Message from Our Sponsors");
    expect(out.lore).toContain("### Editorial Slant");
    expect(out.lore).toContain("### Adventure Hooks");
    expect(out.lore).toContain("### Entity Seeds");
    expect(out.labels).toContain("screamsheet-generator");
    expect(out.labels).toContain("rpg-handout");
  });

  it("keeps GM-only material out of the player handout", () => {
    const out = generateScreamsheetLocal({}, seededRng(11));
    expect(out.content).not.toContain("Adventure Hooks");
    expect(out.content).not.toContain("The Truth Behind the Stories");
  });

  it("honours explicit options, place name, and headline event", () => {
    const out = generateScreamsheetLocal(
      {
        genre: "Cyberpunk",
        publicationType: "Street screamsheet",
        tone: "Paranoid & conspiratorial",
        bias: "Underground / pirate press",
        censorLevel: "Uncensored",
        hookDensity: "Dense (4+ hooks)",
        placeName: "The Gutter Signal",
        headlineEvent: "a blackout that hit only the corporate towers",
        campaignContext: "Night City's combat zone",
      },
      seededRng(2),
    );
    expect(out.title).toContain("The Gutter Signal");
    expect(out.content).toContain("# The Gutter Signal");
    expect(out.content).toContain(
      "a blackout that hit only the corporate towers",
    );
    expect(out.content).toContain("Night City's combat zone");
    expect(out.lore).toContain("Underground / pirate press");
    expect(out.lore).toContain("Street screamsheet");
  });

  it("scales hook count with hook density", () => {
    const light = generateScreamsheetLocal(
      { hookDensity: "Light (1 hook)" },
      seededRng(3),
    );
    const dense = generateScreamsheetLocal(
      { hookDensity: "Dense (4+ hooks)" },
      seededRng(3),
    );
    const countHooks = (lore: string) =>
      lore
        .split("### Adventure Hooks")[1]
        .split("### Entity Seeds")[0]
        .split("\n")
        .filter((line) => line.startsWith("- ")).length;
    expect(countHooks(light.lore)).toBe(1);
    expect(countHooks(dense.lore)).toBe(4);
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateScreamsheetLocal({}, seededRng(9))).toEqual(
      generateScreamsheetLocal({}, seededRng(9)),
    );
  });
});

describe("buildScreamsheetPrompt", () => {
  it("includes resolved options, name ban, and session context", () => {
    const { systemInstruction, userMessage, resolved } = buildScreamsheetPrompt(
      {
        genre: "Western",
        tone: "Sober & factual",
        headlineEvent: "the railroad survey crew never came back",
      },
      "SESSION-CONTEXT-MARKER",
      seededRng(4),
    );
    expect(systemInstruction).toContain(NAME_BAN_PROMPT);
    expect(systemInstruction).toContain("SESSION-CONTEXT-MARKER");
    expect(systemInstruction).toContain("PLAYER-SAFE");
    expect(userMessage).toContain("Genre / Setting: Western");
    expect(userMessage).toContain("Editorial Tone: Sober & factual");
    expect(userMessage).toContain("the railroad survey crew never came back");
    expect(resolved.genre).toBe("Western");
    expect(screamsheetConfig.publicationTypesByGenre["Western"]).toContain(
      resolved.publicationType,
    );
  });

  it("omits optional lines when not provided", () => {
    const { userMessage } = buildScreamsheetPrompt({}, "", seededRng(6));
    expect(userMessage).not.toContain("Campaign Context:");
    expect(userMessage).not.toContain("Current Crisis");
    expect(userMessage).not.toContain("Settlement / Region");
  });
});

describe("parseScreamsheetResponse", () => {
  it("parses a fenced JSON response", () => {
    const out = parseScreamsheetResponse(
      '```json\n{"title":"The Gutter Signal","summary":"s","content":"# c","lore":"### Editorial Slant","labels":["cyberpunk","rpg-handout"]}\n```',
    );
    expect(out.type).toBe("note");
    expect(out.title).toBe("The Gutter Signal");
    expect(out.content).toBe("# c");
    expect(out.labels).toEqual(["cyberpunk", "rpg-handout"]);
    expect(out.status).toBe("active");
  });

  it("falls back to default title and labels", () => {
    const out = parseScreamsheetResponse('{"summary":"s"}');
    expect(out.title).toBe("The Unnamed Bulletin");
    expect(out.labels).toContain("screamsheet-generator");
  });
});
