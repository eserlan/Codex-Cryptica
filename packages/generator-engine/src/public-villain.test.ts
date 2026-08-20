import { describe, expect, it } from "vitest";
import {
  buildVillainPrompt,
  generateVillainLocal,
  parseVillainResponse,
  villainConfig,
} from "./public-villain";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generateVillainLocal", () => {
  it("returns the character villain structure", () => {
    const out = generateVillainLocal({}, seededRng(5));
    expect(out.type).toBe("character");
    expect(out.content).toContain("### Public Face");
    expect(out.content).toContain("### First Signs");
    expect(out.lore).toContain("### Core Concept");
    expect(out.lore).toContain("### The Villain's Plan");
    expect(out.lore).toContain("### Discovery Layers");
    expect(out.labels).toContain("bbeg-generator");
  });

  it("honours explicit options", () => {
    const out = generateVillainLocal(
      {
        genre: "Cyberpunk / Corporate",
        threatScale: "Global",
        archetype: "Crime Lord",
        sympathy: "Purely Monstrous",
      },
      seededRng(2),
    );
    expect(out.lore).toContain("global-scale crime lord");
    expect(out.content).toContain("openly feared threat");
  });

  it("resolves the Random archetype to a concrete one", () => {
    const out = generateVillainLocal({ archetype: "Random" }, seededRng(3));
    expect(out.lore).not.toMatch(/a random-scale random\b/i);
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateVillainLocal({}, seededRng(9))).toEqual(
      generateVillainLocal({}, seededRng(9)),
    );
  });
});

describe("buildVillainPrompt", () => {
  it("embeds options, the consistency pass, ban prompt, and session context", () => {
    const { userMessage, resolved } = buildVillainPrompt(
      {
        genre: "Cosmic Horror",
        tone: "Bleak",
        threatScale: "Cosmic",
        archetype: "Cosmic Entity",
        sympathy: "Arguably Justified",
        campaignContext: "a coastal town hiding a drowned cult",
      },
      "- Existing: The Salt Concord (faction)",
      seededRng(4),
    );
    expect(userMessage).toContain("- Genre / Theme: Cosmic Horror");
    expect(userMessage).toContain("- Threat Scale: Cosmic");
    expect(userMessage).toContain("- Villain Archetype: Cosmic Entity");
    expect(userMessage).toContain("a coastal town hiding a drowned cult");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Salt Concord");
    expect(resolved.threatScale).toBe("Cosmic");

    // Consistency-pass phrases (add-generator skill requires field-specific
    // assertions, not just "some text exists").
    expect(userMessage).toContain("escalate logically stage-to-stage");
    expect(userMessage).toContain(
      "connect coherently to the fatal flaw, methods, or organisation",
    );
    expect(userMessage).toContain(
      "lieutenant's stated loyalty and motivation must not contradict",
    );
    expect(userMessage).toContain(
      "threat scale must be reflected consistently across resources, methods, and the plan's scope",
    );
  });

  it("reuses the canonical 13-theme genre vocabulary", () => {
    expect(villainConfig.genres).toContain("Classic Fantasy");
    expect(villainConfig.genres).toContain("Cyberpunk / Corporate");
    expect(villainConfig.genres.length).toBe(13);
  });
});

describe("parseVillainResponse", () => {
  const { resolved } = buildVillainPrompt({}, "", seededRng(3));

  it("parses fenced JSON and keeps the rich body", () => {
    const json =
      '```json\n{"title":"Vesk Ashgrave","content":"### Public Face\\ny","lore":"### Core Concept","labels":["villain"]}\n```';
    const out = parseVillainResponse(json, resolved);
    expect(out.title).toBe("Vesk Ashgrave");
    expect(out.content).toContain("Public Face");
    expect(out.type).toBe("character");
  });

  it("falls back to the resolved name and throws on bad JSON", () => {
    const out = parseVillainResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.villainName);
    expect(() => parseVillainResponse("nope", resolved)).toThrow();
  });
});
