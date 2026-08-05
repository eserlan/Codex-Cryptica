import { describe, it, expect } from "vitest";
import {
  starSystemConfig,
  generateStarSystemLocal,
  buildStarSystemPrompt,
  parseStarSystemResponse,
} from "./public-star-system";

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

    it("generates between 4 and 7 named major bodies in content", () => {
      const result = generateStarSystemLocal({}, seededRng(7));
      const bodyLines = result.content
        .split("\n")
        .filter((line) => line.startsWith("- **"));
      expect(bodyLines.length).toBeGreaterThanOrEqual(4);
      expect(bodyLines.length).toBeLessThanOrEqual(7);
    });

    it("gives every major body a unique name across many seeds", () => {
      for (let seed = 0; seed < 200; seed++) {
        const result = generateStarSystemLocal({}, seededRng(seed));
        const names = Array.from(
          result.content.matchAll(/^- \*\*\[?([^*[\]]+)\]?/gm),
        ).map((m) => m[1]);
        expect(new Set(names).size).toBe(names.length);
      }
    });

    it("links each major body to a pre-populated World Generator draft", () => {
      const result = generateStarSystemLocal({}, seededRng(9));
      const bodyLines = result.content
        .split("\n")
        .filter((line) => line.startsWith("- **["));
      expect(bodyLines.length).toBeGreaterThan(0);
      for (const line of bodyLines) {
        expect(line).toMatch(/^- \*\*\[[^\]]+\]\(\/generators\/world\?/);
        expect(line).toContain("developSystem=");
        expect(line).toContain("developBody=");
        expect(line).toContain("developBodyType=");
        expect(line).toContain("developContext=");
      }
    });

    it("includes all required content and lore sections", () => {
      const result = generateStarSystemLocal({}, seededRng(3));
      for (const heading of [
        "## Core Concept",
        "## The Star(s)",
        "## Major Bodies",
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
      expect(userMessage).toMatch(/major body count is between 3 and 12/);
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
  });

  describe("parseStarSystemResponse", () => {
    it("parses a well-formed AI response", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        summary: "A contested frontier system.",
        lore: "## Core Concept\nDetails.",
        labels: ["frontier", "contested"],
      });
      const result = parseStarSystemResponse(text);
      expect(result.title).toBe("Halyard's Reach");
      expect(result.labels).toContain("star-system");
      expect(result.labels).toContain("frontier");
    });

    it("linkifies Major Bodies bullets from an AI response into Develop-this-world links", () => {
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: "## Major Bodies\n- **Halyard's Reach II** (Temperate World) — a settled colony.\n\n## History\nDetails.",
      });
      const result = parseStarSystemResponse(text);
      expect(result.lore).toContain("[Halyard's Reach II](/generators/world?");
      expect(result.lore).toContain("developSystem=Halyard%27s+Reach");
      expect(result.lore).toContain("## History");
    });

    it("normalizes and truncates a very long AI-authored body description in the link", () => {
      const longDescription = `a body whose survey report goes on at extraordinary length ${"about local geology ".repeat(20)}and never quite gets to the point`;
      const text = JSON.stringify({
        title: "Halyard's Reach",
        lore: `## Major Bodies\n- **Halyard's Reach II** (Temperate World) — ${longDescription}.\n\n## History\nDetails.`,
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
      const text =
        '```json\n{"title":"Corvane","lore":"## Core Concept\\nDetails."}\n```';
      const result = parseStarSystemResponse(text);
      expect(result.title).toBe("Corvane");
    });

    it("throws when the response has no title", () => {
      const text = JSON.stringify({ lore: "## Core Concept\nDetails." });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when the response has no lore", () => {
      const text = JSON.stringify({ title: "Corvane" });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when the title is a banned name", () => {
      const text = JSON.stringify({
        title: "Aethel",
        lore: "## Core Concept\nDetails.",
      });
      expect(() => parseStarSystemResponse(text)).toThrow();
    });

    it("throws when the title matches an explicitly avoided name", () => {
      const text = JSON.stringify({
        title: "Corvane",
        lore: "## Core Concept\nDetails.",
      });
      expect(() => parseStarSystemResponse(text, ["Corvane"])).toThrow();
    });
  });
});
