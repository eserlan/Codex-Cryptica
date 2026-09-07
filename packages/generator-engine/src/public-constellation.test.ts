import { describe, it, expect } from "vitest";
import {
  constellationConfig,
  generateConstellationLocal,
  buildConstellationPrompt,
  parseConstellationResponse,
} from "./public-constellation";

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("public-constellation", () => {
  describe("generateConstellationLocal", () => {
    it("is deterministic for a fixed seed", () => {
      const a = generateConstellationLocal({}, seededRng(42));
      const b = generateConstellationLocal({}, seededRng(42));
      expect(a).toEqual(b);
    });

    it("passes through explicit options into the output labels", () => {
      const result = generateConstellationLocal({
        genre: "Cyberpunk / Corporate",
        visualImpression: "Weapon",
        practicalUse: "Navigation",
      });
      expect(result.labels).toContain("constellation");
      expect(result.labels).toContain("cyberpunk-corporate");
      expect(result.labels).toContain("weapon");
      expect(result.labels).toContain("navigation");
    });

    it("generates between 4 and 9 stars, connected by valid lines", () => {
      for (let seed = 0; seed < 100; seed++) {
        const result = generateConstellationLocal({}, seededRng(seed));
        const pattern = result.pattern!;
        expect(pattern.stars.length).toBeGreaterThanOrEqual(4);
        expect(pattern.stars.length).toBeLessThanOrEqual(9);
        for (const [a, b] of pattern.lines) {
          expect(a).toBeGreaterThanOrEqual(0);
          expect(a).toBeLessThan(pattern.stars.length);
          expect(b).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThan(pattern.stars.length);
        }
        for (const star of pattern.stars) {
          expect(star.x).toBeGreaterThanOrEqual(0);
          expect(star.x).toBeLessThanOrEqual(100);
          expect(star.y).toBeGreaterThanOrEqual(0);
          expect(star.y).toBeLessThanOrEqual(100);
        }
      }
    });

    it("produces exactly one interpretation with every required field", () => {
      const result = generateConstellationLocal({}, seededRng(3));
      expect(result.interpretations).toHaveLength(1);
      const interpretation = result.interpretations![0];
      expect(interpretation.culture).toBeTruthy();
      expect(interpretation.name).toBe(result.title);
      expect(interpretation.originMyth).toBeTruthy();
      expect(interpretation.seasonalVisibility).toBeTruthy();
      expect(interpretation.practicalUse).toBeTruthy();
      expect(interpretation.culturalMeaning).toBeTruthy();
      expect(interpretation.omen).toBeTruthy();
      expect(interpretation.adventureHook).toBeTruthy();
    });

    it("avoids banned names when an avoid list is provided", () => {
      const [firstBanned] = constellationConfig.names;
      const result = generateConstellationLocal(
        { avoidNames: [...constellationConfig.names.slice(0, -1)] },
        seededRng(5),
      );
      expect(result.title).not.toBe(firstBanned);
    });

    it("splits content (core concept/myth) from lore (GM-only reference)", () => {
      const result = generateConstellationLocal({}, seededRng(11));
      expect(result.content).toContain("## Core Concept");
      expect(result.content).toContain("## Origin Myth");
      expect(result.lore).toContain("## Seasonal Visibility");
      expect(result.lore).toContain("## Practical Use");
      expect(result.lore).toContain("## Cultural & Religious Meaning");
      expect(result.lore).toContain("## Omens");
      expect(result.lore).toContain("## Adventure Hook");
    });
  });

  describe("buildConstellationPrompt", () => {
    it("names every required interpretation field so none get silently dropped", () => {
      const { userMessage } = buildConstellationPrompt({
        genre: "Cosmic Horror",
        visualImpression: "Monster",
      });
      expect(userMessage).toContain("Cosmic Horror");
      expect(userMessage).toContain("Monster");
      for (const field of [
        "culture",
        "originMyth",
        "seasonalVisibility",
        "practicalUse",
        "culturalMeaning",
        "omen",
        "adventureHook",
      ]) {
        expect(userMessage).toContain(field);
      }
      expect(userMessage).toContain('"pattern"');
      expect(userMessage).toContain("valid index");
    });

    it("carries campaign context and its established names into the prompt", () => {
      const { userMessage } = buildConstellationPrompt({
        campaignContext: "A world watched over by the goddess Ilvane.",
      });
      expect(userMessage).toContain("Ilvane");
    });
  });

  describe("parseConstellationResponse", () => {
    function validResponse(overrides: Record<string, unknown> = {}) {
      return JSON.stringify({
        title: "The Widow's Lantern",
        summary: "A three-star constellation read as a warning light.",
        lore: "## Seasonal Visibility\nVisible in winter.\n## Practical Use\nUsed for timekeeping.\n## Cultural & Religious Meaning\nA guardian spirit.\n## Omens\nA fading light warns of betrayal.\n## Adventure Hook\nSomeone wants the lantern's story silenced.",
        labels: ["classic-fantasy"],
        pattern: {
          stars: [
            { x: 10, y: 10, brightness: "bright", name: "The Wick" },
            { x: 20, y: 15, brightness: "moderate" },
            { x: 30, y: 12, brightness: "faint" },
          ],
          lines: [
            [0, 1],
            [1, 2],
          ],
        },
        interpretations: [
          {
            culture: "the Deepwake Fisherfolk",
            name: "The Widow's Lantern",
            visualImpression: "A lantern",
            originMyth: "A widow's light, fixed in place to guide the lost.",
            seasonalVisibility: "Visible in winter.",
            practicalUse: "Used for timekeeping.",
            culturalMeaning: "A guardian spirit.",
            omen: "A fading light warns of betrayal.",
            adventureHook: "Someone wants the lantern's story silenced.",
          },
        ],
        ...overrides,
      });
    }

    it("parses a well-formed response into the public output contract", () => {
      const result = parseConstellationResponse(validResponse());
      expect(result.title).toBe("The Widow's Lantern");
      expect(result.pattern?.stars).toHaveLength(3);
      expect(result.interpretations).toHaveLength(1);
      expect(result.content).toContain("## Core Concept");
      expect(result.lore).toContain("## Omens");
    });

    it("drops a line referencing an out-of-range star index", () => {
      const result = parseConstellationResponse(
        validResponse({
          pattern: {
            stars: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
              { x: 30, y: 30 },
            ],
            lines: [
              [0, 1],
              [1, 99],
            ],
          },
        }),
      );
      expect(result.pattern?.lines).toEqual([[0, 1]]);
    });

    it("throws when the star pattern has fewer than 3 stars", () => {
      expect(() =>
        parseConstellationResponse(
          validResponse({
            pattern: { stars: [{ x: 1, y: 1 }], lines: [] },
          }),
        ),
      ).toThrow();
    });

    it("throws when interpretations is empty", () => {
      expect(() =>
        parseConstellationResponse(validResponse({ interpretations: [] })),
      ).toThrow();
    });

    it("throws when the title is banned", () => {
      expect(() =>
        parseConstellationResponse(validResponse(), ["The Widow's Lantern"]),
      ).toThrow();
    });

    it("throws when the response is missing a title", () => {
      expect(() =>
        parseConstellationResponse(validResponse({ title: "" })),
      ).toThrow();
    });
  });
});
