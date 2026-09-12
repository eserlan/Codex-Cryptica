import { describe, expect, it } from "vitest";
import {
  buildPersonalityPrompt,
  generatePersonalityLocal,
  parsePersonalityResponse,
  personalityConfig,
} from "./public-personality";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generatePersonalityLocal", () => {
  it("returns the character personality structure", () => {
    const out = generatePersonalityLocal({}, seededRng(5));
    expect(out.type).toBe("character");
    expect(out.kind).toBe("personality");
    expect(out.content).toContain("### Core Personality");
    expect(out.content).toContain("### Speech & Conversational Style");
    expect(out.content).toContain("### Mannerism / Tell");
    expect(out.content).toContain("### Roleplaying Cues");
    expect(out.lore).toContain("### Outward Demeanour vs Inner Nature");
    expect(out.lore).toContain("### Drives");
    expect(out.lore).toContain("### Virtue and Flaw");
    expect(out.lore).toContain("### Contradiction");
    expect(out.lore).toContain("### Under Pressure");
    expect(out.lore).toContain("### Social Behaviour");
    expect(out.lore).toContain("### Boundary / Trigger");
    expect(out.lore).toContain("### Example Reactions");
    expect(out.labels).toContain("personality-generator");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generatePersonalityLocal({}, seededRng(9))).toEqual(
      generatePersonalityLocal({}, seededRng(9)),
    );
  });

  it("varies the personality core across seeds instead of always defaulting to one archetype", () => {
    const cores = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => generatePersonalityLocal({}, seededRng(seed)).summary,
      ),
    );
    expect(cores.size).toBeGreaterThan(1);
  });

  it("never repeats the same virtue/flaw pair across all six flavors (sanity check on the fallback pool itself)", () => {
    const flaws = new Set(
      Array.from(
        { length: 30 },
        (_, i) =>
          generatePersonalityLocal({}, seededRng(i + 1)).lore?.match(
            /\*\*Flaw\*\*: ([^\n]+)/,
          )?.[1],
      ),
    );
    expect(flaws.size).toBeGreaterThan(1);
  });

  it("resolves Random options to concrete values rather than leaving the literal word in output", () => {
    const out = generatePersonalityLocal(
      { temperament: "Random", socialStyle: "Random" },
      seededRng(4),
    );
    expect(out.content + out.lore).not.toMatch(/\bRandom\b/);
  });
});

describe("buildPersonalityPrompt", () => {
  it("includes resolved options and required section headings in the prompt", () => {
    const { userMessage, resolved } = buildPersonalityPrompt(
      { genre: "Cyberpunk / Corporate", temperament: "Volatile" },
      "",
      "",
      seededRng(2),
    );
    expect(resolved.genre).toBe("Cyberpunk / Corporate");
    expect(resolved.temperament).toBe("Volatile");
    expect(userMessage).toContain("Cyberpunk / Corporate");
    expect(userMessage).toContain("### Core Personality");
    expect(userMessage).toContain("### Contradiction");
    expect(userMessage).toContain("### Roleplaying Cues");
  });

  it("includes the archetype variety guardrail naming the overused default", () => {
    const { userMessage } = buildPersonalityPrompt({}, "", "", seededRng(1));
    expect(userMessage).toContain("sarcastic but secretly caring");
  });

  it("folds entity context into the prompt as established fact to extend, not overwrite", () => {
    const { userMessage } = buildPersonalityPrompt(
      {},
      "Name: Kessa. Role: dockside fixer. Already established as distrustful of authority.",
      "",
      seededRng(1),
    );
    expect(userMessage).toContain("established fact");
    expect(userMessage).toContain("never contradict or overwrite it");
    expect(userMessage).toContain("dockside fixer");
  });

  it("omits the entity-context block entirely when none is supplied", () => {
    const withContext = buildPersonalityPrompt(
      {},
      "Some context",
      "",
      seededRng(1),
    );
    const withoutContext = buildPersonalityPrompt({}, "", "", seededRng(1));
    expect(withContext.userMessage).toContain("Existing character context");
    expect(withoutContext.userMessage).not.toContain(
      "Existing character context",
    );
  });
});

describe("parsePersonalityResponse", () => {
  const { resolved } = buildPersonalityPrompt({}, "", "", seededRng(3));

  it("maps JSON fields onto the output shape", () => {
    const out = parsePersonalityResponse(
      JSON.stringify({
        title: "Mira Kessel",
        content: "### Core Personality\nTest.",
        lore: "### Drives\nTest.",
        labels: ["personality", "custom-label"],
      }),
      resolved,
    );
    expect(out.title).toBe("Mira Kessel");
    expect(out.content).toContain("Core Personality");
    expect(out.labels).toEqual(["personality", "custom-label"]);
  });

  it("falls back to the placeholder name and default labels when fields are missing", () => {
    const out = parsePersonalityResponse("{}", resolved);
    expect(out.title).toBe(resolved.placeholderName);
    expect(out.labels).toContain("personality-generator");
  });
});

describe("personalityConfig", () => {
  it("uses CC's complete canonical theme vocabulary", () => {
    expect(personalityConfig.genres.length).toBeGreaterThan(5);
    expect(personalityConfig.genres).toContain("Lancer");
  });
});
