import { describe, it, expect } from "vitest";
import {
  constellationConfig,
  generateConstellationLocal,
  buildConstellationPrompt,
  parseConstellationResponse,
  generateNightSkyLocal,
  buildNightSkyPrompt,
  parseNightSkyResponse,
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

    it("always names an anchor star, even when brightness rolls no 'bright' star", () => {
      // Regression: brightness is independently random per star and can
      // legitimately produce zero "bright" stars across a 4-9 star pattern.
      for (let seed = 0; seed < 100; seed++) {
        const result = generateConstellationLocal({}, seededRng(seed));
        expect(
          result.pattern!.stars.some((s) => s.brightness === "bright"),
        ).toBe(true);
        expect(result.pattern!.stars.some((s) => !!s.name)).toBe(true);
      }
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
        summary: "A four-star constellation read as a warning light.",
        lore: "## Seasonal Visibility\nVisible in winter.\n## Practical Use\nUsed for timekeeping.\n## Cultural & Religious Meaning\nA guardian spirit.\n## Omens\nA fading light warns of betrayal.\n## Adventure Hook\nSomeone wants the lantern's story silenced.",
        labels: ["classic-fantasy"],
        pattern: {
          stars: [
            { x: 10, y: 10, brightness: "bright", name: "The Wick" },
            { x: 20, y: 15, brightness: "moderate" },
            { x: 30, y: 12, brightness: "faint" },
            { x: 25, y: 22, brightness: "faint" },
          ],
          lines: [
            [0, 1],
            [1, 2],
            [2, 3],
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
      expect(result.pattern?.stars).toHaveLength(4);
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
              { x: 40, y: 40 },
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

    it("throws when the star pattern has fewer than 4 stars", () => {
      expect(() =>
        parseConstellationResponse(
          validResponse({
            pattern: {
              stars: [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
              ],
              lines: [],
            },
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

  describe("generateNightSkyLocal", () => {
    it("is deterministic for a fixed seed", () => {
      const a = generateNightSkyLocal({}, seededRng(42));
      const b = generateNightSkyLocal({}, seededRng(42));
      expect(a).toEqual(b);
    });

    it("generates between 8 and 15 constellations sharing one culture", () => {
      for (let seed = 0; seed < 60; seed++) {
        const result = generateNightSkyLocal({}, seededRng(seed));
        const sky = result.nightSky!;
        expect(sky.constellations.length).toBeGreaterThanOrEqual(8);
        expect(sky.constellations.length).toBeLessThanOrEqual(15);
        for (const entry of sky.constellations) {
          expect(entry.constellation.interpretations[0].culture).toBe(
            sky.culture,
          );
          expect(constellationConfig.seasons).toContain(entry.season);
          expect(constellationConfig.skyRegions).toContain(entry.skyRegion);
        }
      }
    });

    it("gives every constellation a unique name within one sky", () => {
      for (let seed = 0; seed < 60; seed++) {
        const result = generateNightSkyLocal({}, seededRng(seed));
        const names = result.nightSky!.constellations.map(
          (entry) => entry.constellation.interpretations[0].name,
        );
        expect(new Set(names).size).toBe(names.length);
      }
    });

    it("distributes constellations across more than one season", () => {
      // Fixed low seeds sometimes cluster by chance; a wide sample over many
      // seeds confirms the pool as a whole isn't secretly collapsed to one.
      const seasonsSeen = new Set<string>();
      for (let seed = 0; seed < 60; seed++) {
        const result = generateNightSkyLocal({}, seededRng(seed));
        for (const entry of result.nightSky!.constellations) {
          seasonsSeen.add(entry.season);
        }
      }
      expect(seasonsSeen.size).toBeGreaterThan(1);
    });

    it("ties at least some constellations' myths back to another by name", () => {
      // Cross-referencing is probabilistic (35% per entry, once entries
      // already exist) — over many seeds it should show up somewhere.
      let sawCrossReference = false;
      for (let seed = 0; seed < 40 && !sawCrossReference; seed++) {
        const result = generateNightSkyLocal({}, seededRng(seed));
        const names = result.nightSky!.constellations.map(
          (entry) => entry.constellation.interpretations[0].name,
        );
        sawCrossReference = result.nightSky!.constellations.some((entry) =>
          names.some(
            (name) =>
              name !== entry.constellation.interpretations[0].name &&
              entry.constellation.interpretations[0].originMyth.includes(name),
          ),
        );
      }
      expect(sawCrossReference).toBe(true);
    });

    it("splits content (by-season index) from lore (per-constellation reference)", () => {
      const result = generateNightSkyLocal({}, seededRng(11));
      expect(result.content).toContain("## Core Concept");
      expect(result.content).toContain("## Constellations by Season");
      const firstName =
        result.nightSky!.constellations[0].constellation.interpretations[0]
          .name;
      expect(result.lore).toContain(firstName);
    });
  });

  describe("buildNightSkyPrompt", () => {
    it("asks for 8 to 15 entries sharing one culture, with cross-references", () => {
      const { userMessage } = buildNightSkyPrompt({
        genre: "Cosmic Horror",
      });
      expect(userMessage).toContain("Cosmic Horror");
      expect(userMessage).toContain("8 to 15");
      expect(userMessage).toContain('"culture"');
      expect(userMessage).toContain("originMyth");
      expect(userMessage).toContain("season");
    });
  });

  describe("parseNightSkyResponse", () => {
    function validNightSkyResponse(overrides: Record<string, unknown> = {}) {
      const entry = (name: string, season: string, skyRegion: string) => ({
        season,
        skyRegion,
        pattern: {
          stars: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
            { x: 30, y: 30 },
            { x: 40, y: 40 },
          ],
          lines: [
            [0, 1],
            [1, 2],
            [2, 3],
          ],
        },
        interpretation: {
          culture: "the Deepwake Fisherfolk",
          name,
          visualImpression: "A lantern",
          originMyth: "A guiding light fixed in place.",
          seasonalVisibility: "Visible in winter.",
          practicalUse: "Used for timekeeping.",
          culturalMeaning: "A guardian spirit.",
          omen: "A fading light warns of betrayal.",
          adventureHook: "Someone wants the story silenced.",
        },
      });
      return JSON.stringify({
        title: "The Deepwake Sky",
        summary: "A full night sky read by the Deepwake Fisherfolk.",
        lore: "### Entry one\nDetails.",
        labels: ["classic-fantasy"],
        culture: "the Deepwake Fisherfolk",
        constellations: [
          entry("The Widow's Lantern", "Winter", "North"),
          entry("The Iron Serpent", "Summer", "South"),
          entry("The Ashen Hound", "Spring", "East"),
          entry("The Broken Wheel", "Autumn", "West"),
          entry("The Ember Plough", "Year-round", "Zenith"),
          entry("The Silent Archer", "Winter", "Circumpolar"),
          entry("The Drowned Crown", "Summer", "North"),
          entry("The Ferryman's Oar", "Spring", "South"),
        ],
        ...overrides,
      });
    }

    it("parses a well-formed response into the public output contract", () => {
      const result = parseNightSkyResponse(validNightSkyResponse());
      expect(result.nightSky?.culture).toBe("the Deepwake Fisherfolk");
      expect(result.nightSky?.constellations).toHaveLength(8);
      expect(result.content).toContain("## Constellations by Season");
    });

    it("forces every entry's interpretation.culture to the top-level culture", () => {
      const result = parseNightSkyResponse(validNightSkyResponse());
      for (const entry of result.nightSky!.constellations) {
        expect(entry.constellation.interpretations[0].culture).toBe(
          "the Deepwake Fisherfolk",
        );
      }
    });

    it("throws when fewer than 8 usable constellations remain", () => {
      expect(() =>
        parseNightSkyResponse(
          validNightSkyResponse({
            constellations: [
              {
                season: "Winter",
                skyRegion: "North",
                pattern: {
                  stars: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                    { x: 3, y: 3 },
                  ],
                  lines: [],
                },
                interpretation: {
                  culture: "the Deepwake Fisherfolk",
                  name: "The Widow's Lantern",
                  visualImpression: "A lantern",
                  originMyth: "A guiding light.",
                  seasonalVisibility: "Visible in winter.",
                  practicalUse: "Used for timekeeping.",
                  culturalMeaning: "A guardian spirit.",
                  omen: "A fading light warns of betrayal.",
                  adventureHook: "Someone wants the story silenced.",
                },
              },
            ],
          }),
        ),
      ).toThrow();
    });

    it("drops an entry with an invalid season or sky region", () => {
      const response = JSON.parse(validNightSkyResponse());
      response.constellations[0].season = "Whenever";
      expect(() => parseNightSkyResponse(JSON.stringify(response))).toThrow();
    });

    it("throws when the response is missing a culture", () => {
      expect(() =>
        parseNightSkyResponse(validNightSkyResponse({ culture: "" })),
      ).toThrow();
    });
  });
});
