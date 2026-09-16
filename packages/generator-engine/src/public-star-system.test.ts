import { describe, it, expect } from "vitest";
import {
  starSystemConfig,
  generateStarSystemLocal,
  buildStarSystemPrompt,
  parseStarSystemResponse,
  STAR_TYPE_COLORS,
} from "./public-star-system";

const STANDARD_SPECTRAL_CLASSES = ["O", "B", "A", "F", "G", "K", "M"];

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe("public-star-system", () => {
  describe("generateStarSystemLocal", () => {
    it("is deterministic for a fixed seed", () => {
      const a = generateStarSystemLocal({}, seededRng(42));
      const b = generateStarSystemLocal({}, seededRng(42));
      expect(a).toEqual(b);
    });

    it("passes through explicit options into the output labels", () => {
      const result = generateStarSystemLocal({
        systemType: "Binary System",
        genre: "Cyberpunk",
        civilisationLevel: "Core System",
        systemCharacter: "Industrial",
        scientificRealism: "Hard Sci-Fi",
      });
      expect(result.labels).toContain("star-system");
      expect(result.labels).toContain("binary-system");
      expect(result.labels).toContain("cyberpunk");
      expect(result.labels).toContain("core-system");
      expect(result.labels).toContain("industrial");
    });

    it("generates between 4 and 7 named major bodies, as #### headers and/or nested bullets", () => {
      const result = generateStarSystemLocal({}, seededRng(7));
      const bodyLines = result.content
        .split("\n")
        .filter((line) => line.startsWith("#### ") || line.startsWith("- **"));
      expect(bodyLines.length).toBeGreaterThanOrEqual(4);
      expect(bodyLines.length).toBeLessThanOrEqual(7);
    });

    it("gives every major body a unique name across many seeds", () => {
      for (let seed = 0; seed < 200; seed++) {
        const result = generateStarSystemLocal({}, seededRng(seed));
        const headerNames = Array.from(
          result.content.matchAll(/^#### \[?([^*[\]]+)\]?/gm),
        ).map((m) => m[1]);
        const bulletNames = Array.from(
          result.content.matchAll(/^- \*\*\[?([^*[\]]+)\]?/gm),
        ).map((m) => m[1]);
        const names = [...headerNames, ...bulletNames];
        expect(new Set(names).size).toBe(names.length);
      }
    });

    it("links each major body to a pre-populated World Generator draft", () => {
      const result = generateStarSystemLocal({}, seededRng(9));
      const bodyLines = result.content
        .split("\n")
        .filter(
          (line) => line.startsWith("#### [") || line.startsWith("- **["),
        );
      expect(bodyLines.length).toBeGreaterThan(0);
      for (const line of bodyLines) {
        expect(line).toMatch(/\[[^\]]+\]\(\/generators\/world\?/);
        expect(line).toContain("developSystem=");
        expect(line).toContain("developBody=");
        expect(line).toContain("developBodyType=");
        expect(line).toContain("developContext=");
      }
    });

    it("carries structured context (system, distance/parent) in each Develop-this-world link", () => {
      for (let seed = 0; seed < 30; seed++) {
        const result = generateStarSystemLocal({}, seededRng(seed));
        const linkedBodies = result.bodies?.filter((b) => b.description) ?? [];
        for (const body of linkedBodies) {
          const line = result.content
            .split("\n")
            .find((l) =>
              l.includes(
                `developBody=${encodeURIComponent(body.name).replace(/%20/g, "+")}`,
              ),
            );
          if (!line) continue;
          const context = decodeURIComponent(
            line.match(/developContext=([^)&]+)/)?.[1]?.replace(/\+/g, " ") ??
              "",
          );
          expect(context).toContain(result.title);
          if (body.parentName) {
            expect(context).toContain(`orbiting ${body.parentName}`);
          } else if (body.distanceAU !== undefined) {
            expect(context).toContain(`${body.distanceAU} AU from the star`);
          }
        }
      }
    });

    it("nests each moon/station bullet directly under its parent's #### heading", () => {
      const result = generateStarSystemLocal({}, seededRng(11));
      const lines = result.content.split("\n");
      let currentHeader: string | null = null;
      for (const line of lines) {
        if (line.startsWith("#### ")) {
          currentHeader = line;
        } else if (line.startsWith("- **")) {
          expect(currentHeader).not.toBeNull();
        }
      }
    });

    it("includes all required content and lore sections", () => {
      const result = generateStarSystemLocal({}, seededRng(3));
      for (const heading of [
        "## Core Concept",
        "## The Star(s)",
        "## Major Bodies",
        "## Lifeforms",
        "## Settlements & Factions",
        "## Resources & Strategic Importance",
        "## Travel Hazards",
      ]) {
        expect(result.content).toContain(heading);
      }
      for (const heading of [
        "## History",
        "## System-Wide Conflict or Mystery",
        "## Adventure Hooks",
      ]) {
        expect(result.lore).toContain(heading);
      }
    });

    it("sets a starType matching a spectral class named in the star description", () => {
      for (let seed = 0; seed < 50; seed++) {
        const result = generateStarSystemLocal(
          { systemType: "Single Star" },
          seededRng(seed),
        );
        expect(result.starType).toBeDefined();
        expect(STANDARD_SPECTRAL_CLASSES).toContain(result.starType);
        expect(result.content).toContain(`${result.starType}-type`);
        expect(STAR_TYPE_COLORS[result.starType!]).toBeTruthy();
      }
    });

    it("sets an exotic starType for an Exotic system, matching the description", () => {
      for (let seed = 0; seed < 20; seed++) {
        const result = generateStarSystemLocal(
          { systemType: "Exotic" },
          seededRng(seed),
        );
        expect(result.starType).toBeDefined();
        expect(STANDARD_SPECTRAL_CLASSES).not.toContain(result.starType);
        expect(STAR_TYPE_COLORS[result.starType!]).toBeTruthy();
      }
    });

    it("gives every primary body a strictly increasing distanceAU, matching the text", () => {
      for (let seed = 0; seed < 50; seed++) {
        const result = generateStarSystemLocal({}, seededRng(seed));
        const distances = Array.from(
          result.content.matchAll(/— ([\d.]+) AU from the star\./g),
        ).map((m) => Number(m[1]));
        expect(distances.length).toBeGreaterThan(0);
        for (let i = 1; i < distances.length; i++) {
          expect(distances[i]).toBeGreaterThan(distances[i - 1]);
        }
        expect(result.bodies?.some((b) => b.distanceAU !== undefined)).toBe(
          true,
        );
      }
    });

    it("does not give a moon its own distanceAU (it shares its parent's)", () => {
      for (let seed = 0; seed < 50; seed++) {
        const result = generateStarSystemLocal({}, seededRng(seed));
        const byName = new Map((result.bodies ?? []).map((b) => [b.name, b]));
        for (const body of result.bodies ?? []) {
          if (body.parentName && byName.has(body.parentName)) {
            expect(body.distanceAU).toBeUndefined();
          }
        }
      }
    });

    it("never generates a moon type as the first body (it would have no parent to orbit)", () => {
      for (let seed = 0; seed < 200; seed++) {
        const result = generateStarSystemLocal({}, seededRng(seed));
        const firstBody = result.bodies?.[0];
        expect(firstBody?.type).not.toBe("Barren Moon");
        expect(firstBody?.type).not.toBe("Frozen Moon");
        // A parentless first body must be a primary with its own AU distance.
        expect(firstBody?.distanceAU).toBeDefined();
      }
    });

    it("avoids names passed in avoidNames when an alternative exists", () => {
      const avoid = starSystemConfig.names.slice(0, -1);
      const result = generateStarSystemLocal({ avoidNames: avoid });
      expect(avoid).not.toContain(result.title);
    });
  });

  describe("buildStarSystemPrompt", () => {
    it("names all required lore sections in the schema", () => {
      const { userMessage } = buildStarSystemPrompt({});
      for (const heading of [
        "## Core Concept",
        "## The Star(s)",
        "## Major Bodies",
        "## Lifeforms",
        "## Settlements & Factions",
        "## Resources & Strategic Importance",
        "## Travel Hazards",
        "## History",
        "## System-Wide Conflict or Mystery",
        "## Adventure Hooks",
      ]) {
        expect(userMessage).toContain(heading);
      }
    });

    it("requires between 3 and 12 major bodies", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(/between 3 and 12/);
    });

    it("includes the specific consistency-pass checks by name", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(/"bodies" has between 3 and 12 entries/);
      expect(userMessage).toMatch(
        /conflict or mystery is foreshadowed elsewhere/,
      );
    });

    it("varies realism guidance by scientificRealism option", () => {
      const hard = buildStarSystemPrompt({
        scientificRealism: "Hard Sci-Fi",
      }).userMessage;
      const cinematic = buildStarSystemPrompt({
        scientificRealism: "Cinematic",
      }).userMessage;
      expect(hard).toMatch(/no unexplained faster-than-light travel/);
      expect(cinematic).toMatch(/practical FTL corridors/);
    });

    it("includes explicit avoided names when provided", () => {
      const { userMessage } = buildStarSystemPrompt({
        avoidNames: ["Kesh-9"],
      });
      expect(userMessage).toContain("Kesh-9");
    });

    it("tells the AI not to write prose under Major Bodies and to put every body in the bodies array instead", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(
        /Do not write anything under "## Major Bodies"/,
      );
      expect(userMessage).toMatch(/"description": string/);
      expect(userMessage).toMatch(/generated automatically from "bodies"/);
    });

    it("requires a starType field naming a spectral classification", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(/"starType"/);
      expect(userMessage).toMatch(/"O", "B", "A", "F", "G", "K", "M"/);
      expect(userMessage).toMatch(/spectral classification/);
    });

    it("requires a distanceAU field for travel-time estimates", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(/"distanceAU"/);
      expect(userMessage).toMatch(/astronomical units/);
      expect(userMessage).toMatch(/strictly increasing/);
    });

    it("requires each body's description to state a concrete economy/survival/travel/conflict role", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(/economy/);
      expect(userMessage).toMatch(/survival/);
      expect(userMessage).toMatch(/travel/);
      expect(userMessage).toMatch(/conflict \(a contested asset/);
      expect(userMessage).toMatch(/what it does there/);
    });

    it("requires the summary to describe the whole system, not one body", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(
        /"summary" must describe the system as a whole/,
      );
      expect(userMessage).toMatch(
        /never zoom in on a single body, faction, or station/,
      );
    });

    it("requires politically ambiguous factions and conflicts", () => {
      const { userMessage } = buildStarSystemPrompt({});
      expect(userMessage).toMatch(/politically ambiguous/);
      expect(userMessage).toMatch(
        /neither should be flagged as simply "the villains"/,
      );
      expect(userMessage).toMatch(/not a mystery with a pre-decided villain/);
    });

    it("gives genre-specific resource-plausibility guidance", () => {
      const hardSciFi = buildStarSystemPrompt({
        genre: "Hard Sci-Fi",
      }).userMessage;
      const postApoc = buildStarSystemPrompt({
        genre: "Post-Apocalyptic",
      }).userMessage;
      expect(hardSciFi).toMatch(/scientifically plausible/);
      expect(postApoc).toMatch(/scarcity and salvage/);
    });
  });

  describe("parseStarSystemResponse", () => {
    // A minimal valid "bodies" array — 3 primaries is the floor the parser
    // requires, matching the "between 3 and 12" prompt rule.
    const VALID_BODIES = [
      {
        name: "Verdant-4",
        type: "Temperate World",
        description: "a settled colony",
        distanceAU: 1.2,
      },
      {
        name: "Calyx Station",
        type: "Orbital Habitat",
        description: "orbits Verdant-4, processing its harvests",
        parentName: "Verdant-4",
      },
      {
        name: "Nereus",
        type: "Ice Giant",
        description: "a distant ice giant",
        distanceAU: 8.5,
      },
      {
        name: "Sunder Belt",
        type: "Asteroid Belt",
        description: "a dense ring of mineral-rich debris",
        distanceAU: 4.4,
      },
    ];

    it("parses a well-formed AI response", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        summary: "A contested frontier system.",
        lore: "## Core Concept\nDetails.",
        labels: ["frontier", "contested"],
        bodies: VALID_BODIES,
      });
      const result = parseStarSystemResponse(text);
      expect(result.title).toBe("Halyard's Reach");
      expect(result.labels).toContain("star-system");
      expect(result.labels).toContain("frontier");
    });

    it("renders Major Bodies from the bodies array — including a moon/station the AI's own prose omitted", () => {
      // Reproduces a real draft: the AI wrote Calyx Station's bullet in its
      // own "## Major Bodies" prose but never included it in "bodies". Since
      // the section is now always server-rendered from "bodies", it appears
      // regardless of what (if anything) the AI wrote under the heading.
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Major Bodies\nSome stale AI-written prose that should be discarded entirely.\n\n## History\nDetails.",
        bodies: VALID_BODIES,
      });
      const result = parseStarSystemResponse(text);
      expect(result.lore).toContain("[Verdant-4](/generators/world?");
      expect(result.lore).toContain("developSystem=Halyard%27s+Reach");
      expect(result.lore).toContain("[Calyx Station](/generators/world?");
      expect(result.lore).toContain("developBody=Calyx+Station");
      expect(result.lore).not.toContain("Some stale AI-written prose");
      expect(result.lore).toContain("## History");
      // A blank line must separate the generated section from the next
      // heading, not just a single newline (which markdown still parses,
      // but reads as a formatting glitch).
      expect(result.lore).toContain(".\n\n## History");
    });

    it("inserts a Major Bodies section even when the AI omitted the heading entirely", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## The Star(s)\nA steady G-type yellow dwarf.\n\n## Lifeforms\nNone confirmed.",
        bodies: VALID_BODIES,
      });
      const result = parseStarSystemResponse(text);
      expect(result.lore).toContain("## Major Bodies");
      expect(result.lore).toContain("[Nereus](/generators/world?");
      const majorBodiesIndex = result.lore.indexOf("## Major Bodies");
      const lifeformsIndex = result.lore.indexOf("## Lifeforms");
      expect(majorBodiesIndex).toBeGreaterThan(-1);
      expect(majorBodiesIndex).toBeLessThan(lifeformsIndex);
    });

    it("passes through a valid distanceAU per body from the AI response", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES,
      });
      const result = parseStarSystemResponse(text);
      const verdant = result.bodies?.find((b) => b.name === "Verdant-4");
      expect(verdant?.distanceAU).toBe(1.2);
    });

    it("drops a non-numeric or non-positive distanceAU from the AI response", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: [
          ...VALID_BODIES.slice(1),
          {
            name: "Verdant-4",
            type: "Temperate World",
            description: "a settled colony",
            distanceAU: "far",
          },
        ],
      });
      const result = parseStarSystemResponse(text);
      const verdant = result.bodies?.find((b) => b.name === "Verdant-4");
      expect(verdant?.distanceAU).toBeUndefined();
    });

    it("drops a body entry with no description", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: [
          ...VALID_BODIES,
          { name: "No Description World", type: "Ocean World" },
        ],
      });
      const result = parseStarSystemResponse(text);
      expect(
        result.bodies?.some((b) => b.name === "No Description World"),
      ).toBe(false);
    });

    it("cleans up duplicated punctuation and doubled whitespace from AI wording slips", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        summary: "A  contested system with a rare mineral deposit!!",
        lore: "## Core Concept\nA  frontier system on the edge of collapse..\n\n## History\nAn old war ended badly—- for everyone involved.",
        bodies: VALID_BODIES,
      });
      const result = parseStarSystemResponse(text);
      expect(result.summary).toBe(
        "A contested system with a rare mineral deposit!",
      );
      expect(result.lore).toContain(
        "A frontier system on the edge of collapse.",
      );
      expect(result.lore).not.toContain("  ");
      expect(result.lore).toContain(
        "An old war ended badly— for everyone involved.",
      );
      expect(result.lore).not.toContain("—-");
    });

    it("strips a body description's trailing dash so it doesn't collide with the generated AU/bullet suffix", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: [
          {
            name: "Kivu Prime",
            type: "Rocky Planet",
            description: "the administrative core of the system's bureaucracy—",
            distanceAU: 0.4,
          },
          ...VALID_BODIES.slice(1),
        ],
      });
      const result = parseStarSystemResponse(text);
      expect(result.lore).toContain(
        "the administrative core of the system's bureaucracy — 0.4 AU from the star.",
      );
      expect(result.lore).not.toMatch(/—[\s-]*—/);
      // The "Develop this world" link's context must also be clean, not just
      // the rendered text — it's built separately from the same description.
      const contextMatch = result.lore.match(/developContext=([^)&]+)/);
      const context = decodeURIComponent(
        (contextMatch?.[1] ?? "").replace(/\+/g, " "),
      );
      expect(context).not.toMatch(/—\s*\./);
      expect(context.startsWith("the administrative core")).toBe(true);
    });

    it("passes through a valid starType from the AI response", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## The Star(s)\nA red dwarf.\n\n## Core Concept\nDetails.",
        bodies: VALID_BODIES,
        starType: "M",
      });
      const result = parseStarSystemResponse(text);
      expect(result.starType).toBe("M");
    });

    it("omits starType when the AI response doesn't provide one", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES,
      });
      const result = parseStarSystemResponse(text);
      expect(result.starType).toBeUndefined();
    });

    it("normalizes and truncates a very long AI-authored body description in the link", () => {
      const longDescription = `a body whose survey report goes on at extraordinary length ${"about local geology ".repeat(20)}and never quite gets to the point`;
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: [
          ...VALID_BODIES.slice(1),
          {
            name: "Verdant-4",
            type: "Temperate World",
            description: longDescription,
            distanceAU: 1.2,
          },
        ],
      });
      const result = parseStarSystemResponse(text);
      const match = result.lore.match(/developContext=([^)&]+)/);
      expect(match).not.toBeNull();
      const contextValue = decodeURIComponent(
        (match?.[1] ?? "").replace(/\+/g, " "),
      );
      expect(contextValue.length).toBeLessThanOrEqual(220);
      expect(contextValue).not.toContain("\n");
    });

    it("strips a ```json fence before parsing", () => {
      const text = `\`\`\`json\n${JSON.stringify({
        title: "Corvane",
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES,
      })}\n\`\`\``;
      const result = parseStarSystemResponse(text);
      expect(result.title).toBe("Corvane");
    });

    it("throws when the response has no title", () => {
      const text = JSON.stringify({
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES,
      });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when the response has no lore", () => {
      const text = JSON.stringify({ title: "Corvane", bodies: VALID_BODIES });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when the title is a banned name", () => {
      const text = JSON.stringify({
        title: "Aethel",
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES,
      });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when the title matches an explicitly avoided name", () => {
      const text = JSON.stringify({
        title: "Corvane",
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES,
      });
      expect(() => parseStarSystemResponse(text, ["Corvane"])).toThrow();
    });

    it("throws when bodies has fewer than 3 usable entries", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
        bodies: VALID_BODIES.slice(0, 2),
      });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when bodies is missing entirely", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Core Concept\nDetails.",
      });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });
  });
});
