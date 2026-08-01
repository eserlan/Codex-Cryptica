import { describe, it, expect } from "vitest";
import {
  generateStarterConstellationLocal,
  buildStarterConstellationPrompt,
  parseStarterConstellationResponse,
  STARTER_CONSTELLATION_THEME_IDS,
} from "./starter-constellation";

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("generateStarterConstellationLocal", () => {
  it.each(STARTER_CONSTELLATION_THEME_IDS)(
    "produces a valid 4-6 entity constellation for theme %s",
    (themeId) => {
      const result = generateStarterConstellationLocal(
        { themeId },
        seededRng(42),
      );

      expect(result.themeId).toBe(themeId);
      expect(result.entities.length).toBeGreaterThanOrEqual(4);
      expect(result.entities.length).toBeLessThanOrEqual(6);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeGreaterThan(0);

      const ids = new Set(result.entities.map((e) => e.id));
      expect(ids.size).toBe(result.entities.length);

      // Every entity is referenced by at least one relationship.
      const referencedIds = new Set<string>();
      for (const rel of result.relationships) {
        expect(ids.has(rel.sourceId)).toBe(true);
        expect(ids.has(rel.targetId)).toBe(true);
        referencedIds.add(rel.sourceId);
        referencedIds.add(rel.targetId);
      }
      for (const id of ids) {
        expect(referencedIds.has(id)).toBe(true);
      }
    },
  );

  it("falls back to a default theme for unknown theme ids without throwing", () => {
    const result = generateStarterConstellationLocal({
      themeId: "not-a-real-theme",
    });
    expect(result.entities.length).toBeGreaterThanOrEqual(4);
  });

  it("adapts entity subtypes to the selected theme", () => {
    const fantasy = generateStarterConstellationLocal(
      { themeId: "fantasy" },
      seededRng(1),
    );
    const cyberpunk = generateStarterConstellationLocal(
      { themeId: "cyberpunk" },
      seededRng(1),
    );

    const fantasySubtypes = fantasy.entities.map((e) => e.subtype);
    const cyberpunkSubtypes = cyberpunk.entities.map((e) => e.subtype);

    expect(fantasySubtypes).toContain("Region");
    expect(cyberpunkSubtypes).toContain("District");
    expect(cyberpunkSubtypes).toContain("Corporation");

    const cosmicHorror = generateStarterConstellationLocal(
      { themeId: "cosmic_horror" },
      seededRng(1),
    );
    expect(cosmicHorror.entities.map((entity) => entity.subtype)).toContain(
      "Anomaly",
    );
  });

  it("weaves an empty premise into a theme-only constellation without error", () => {
    const result = generateStarterConstellationLocal({
      themeId: "horror",
      premise: "",
    });
    expect(result.entities.length).toBeGreaterThanOrEqual(4);
  });

  it("notes an off-theme premise without abandoning the theme's archetypes", () => {
    const result = generateStarterConstellationLocal({
      themeId: "horror",
      premise: "Spaceships and laser cannons",
    });
    expect(result.summary).toContain("Spaceships and laser cannons");
    expect(
      result.entities.some(
        (e) =>
          e.subtype === "Parish" ||
          e.subtype === "Domain" ||
          e.subtype === "Circle" ||
          e.subtype === "Curse",
      ),
    ).toBe(true);
  });
});

describe("buildStarterConstellationPrompt / parseStarterConstellationResponse", () => {
  it("builds a prompt referencing the theme and premise", () => {
    const prompt = buildStarterConstellationPrompt({
      themeId: "cyberpunk",
      premise: "Corporation hijacking the net grid",
    });
    expect(prompt.systemInstruction).toContain("Cyberpunk");
    expect(prompt.userMessage).toContain("Corporation hijacking the net grid");
  });

  it("parses a well-formed AI JSON response", () => {
    const config = { themeId: "cyberpunk" };
    const raw = JSON.stringify({
      title: "Neon Sprawl Constellation",
      summary: "A district under corporate siege.",
      entities: [
        {
          id: "e1",
          title: "Neon District",
          type: "location",
          subtype: "District",
          summary: "s",
          content: "c",
          labels: ["a"],
        },
        {
          id: "e2",
          title: "Kessler Dynamics",
          type: "faction",
          subtype: "Corporation",
          summary: "s",
          content: "c",
          labels: ["a"],
        },
        {
          id: "e3",
          title: "Neon Vipers",
          type: "faction",
          subtype: "Gang",
          summary: "s",
          content: "c",
          labels: ["a"],
        },
        {
          id: "e4",
          title: "Mira Solenne",
          type: "character",
          subtype: "net-runner",
          summary: "s",
          content: "c",
          labels: ["a"],
        },
        {
          id: "e5",
          title: "Net Grid Hijack",
          type: "threat",
          subtype: "Conflict",
          summary: "s",
          content: "c",
          labels: ["a"],
        },
      ],
      relationships: [
        {
          sourceId: "e2",
          targetId: "e1",
          relation: "based in",
          bidirectional: true,
        },
        {
          sourceId: "e4",
          targetId: "e2",
          relation: "leads",
          bidirectional: true,
        },
      ],
    });

    const result = parseStarterConstellationResponse(raw, config);
    expect(result.entities).toHaveLength(5);
    expect(result.relationships).toHaveLength(2);
    expect(result.themeId).toBe("cyberpunk");
  });

  it("tolerates markdown code fences around the JSON", () => {
    const config = { themeId: "fantasy" };
    const raw =
      "```json\n" +
      JSON.stringify({
        title: "T",
        summary: "S",
        entities: [
          {
            id: "e1",
            title: "A",
            type: "location",
            subtype: "Region",
            summary: "s",
            content: "c",
            labels: [],
          },
          {
            id: "e2",
            title: "B",
            type: "location",
            subtype: "Settlement",
            summary: "s",
            content: "c",
            labels: [],
          },
          {
            id: "e3",
            title: "C",
            type: "faction",
            subtype: "Faction",
            summary: "s",
            content: "c",
            labels: [],
          },
          {
            id: "e4",
            title: "D",
            type: "character",
            subtype: "knight",
            summary: "s",
            content: "c",
            labels: [],
          },
        ],
        relationships: [],
      }) +
      "\n```";

    const result = parseStarterConstellationResponse(raw, config);
    expect(result.entities).toHaveLength(4);
  });

  it("throws when the response has too few entities, so the caller can fall back locally", () => {
    const config = { themeId: "fantasy" };
    const raw = JSON.stringify({
      title: "T",
      summary: "S",
      entities: [
        {
          id: "e1",
          title: "A",
          type: "location",
          subtype: "Region",
          summary: "s",
          content: "c",
          labels: [],
        },
      ],
      relationships: [],
    });

    expect(() => parseStarterConstellationResponse(raw, config)).toThrow();
  });

  it("drops relationships referencing unknown entity ids", () => {
    const config = { themeId: "fantasy" };
    const raw = JSON.stringify({
      title: "T",
      summary: "S",
      entities: [
        {
          id: "e1",
          title: "A",
          type: "location",
          subtype: "Region",
          summary: "s",
          content: "c",
          labels: [],
        },
        {
          id: "e2",
          title: "B",
          type: "location",
          subtype: "Settlement",
          summary: "s",
          content: "c",
          labels: [],
        },
        {
          id: "e3",
          title: "C",
          type: "faction",
          subtype: "Faction",
          summary: "s",
          content: "c",
          labels: [],
        },
        {
          id: "e4",
          title: "D",
          type: "character",
          subtype: "knight",
          summary: "s",
          content: "c",
          labels: [],
        },
      ],
      relationships: [{ sourceId: "e1", targetId: "ghost", relation: "x" }],
    });

    const result = parseStarterConstellationResponse(raw, config);
    expect(result.relationships).toHaveLength(0);
  });
});
