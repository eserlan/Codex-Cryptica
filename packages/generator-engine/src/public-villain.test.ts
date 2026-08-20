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

  it("tags a conflictDomain and varies it across seeds instead of always defaulting to one domain", () => {
    const domains = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map(
        (seed) => generateVillainLocal({}, seededRng(seed)).conflictDomain,
      ),
    );
    for (const domain of domains) {
      expect(typeof domain).toBe("string");
    }
    expect(domains.size).toBeGreaterThan(1);
  });

  it("varies the Ultimate Goal text by World Relation instead of always reading Reformer/Guardian", () => {
    const predator = generateVillainLocal(
      { worldRelation: "Predator" },
      seededRng(1),
    );
    const escapee = generateVillainLocal(
      { worldRelation: "Escapee" },
      seededRng(1),
    );
    const servant = generateVillainLocal(
      { worldRelation: "Servant" },
      seededRng(1),
    );
    expect(predator.lore).toContain(
      "wants the current system left standing but quietly rigged",
    );
    expect(escapee.lore).toContain("wants out of an obligation");
    expect(servant.lore).toContain("is carrying out the will of something");
    expect(predator.lore).not.toContain("wants out of an obligation");
    expect(escapee.lore).not.toContain(
      "wants the current system left standing but quietly rigged",
    );
  });

  it("resolves the Random world relation to a concrete one", () => {
    const out = generateVillainLocal({ worldRelation: "Random" }, seededRng(3));
    expect(out.lore).not.toMatch(/at heart a random,/i);
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

    // Conflict-domain variety guardrail.
    expect(userMessage).toContain('"conflictDomain"');
    expect(userMessage).toContain(
      "Avoid using logistics, supply chains, corporate consolidation, municipal bureaucracy, data-routing as that dominant domain",
    );
  });

  it("embeds the World Relation option, its definition, and the anti-default guardrail", () => {
    const { userMessage, resolved } = buildVillainPrompt(
      { worldRelation: "Escapee" },
      "",
      seededRng(1),
    );
    expect(resolved.worldRelation).toBe("Escapee");
    expect(userMessage).toContain("- World Relation: Escapee");
    expect(userMessage).toContain(
      "wants out of their situation or obligations, regardless of what collateral damage",
    );
    expect(userMessage).toContain(
      "MUST shape 'Ultimate Goal', 'Motivation', and 'Why Now' directly",
    );
    expect(userMessage).toContain(
      'do not default to a Reformer/Guardian "the existing institutions have failed, I must take control" framing unless World Relation is literally Reformer or Guardian',
    );
  });

  it("reuses the canonical 12-relation world-relation vocabulary", () => {
    expect(villainConfig.worldRelations).toContain("Predator");
    expect(villainConfig.worldRelations).toContain("Servant");
    // 12 relations + "Random".
    expect(villainConfig.worldRelations.length).toBe(13);
  });

  it("includes recent conflict domains in the variety guardrail when provided", () => {
    const { userMessage } = buildVillainPrompt({}, "", seededRng(1), [
      "Cult Ritual",
      "Military Conquest",
    ]);
    expect(userMessage).toContain(
      "Domains used in this session's recent villains, most recent first: Cult Ritual, Military Conquest",
    );
  });

  it("omits the recent-domains note when no history is provided", () => {
    const { userMessage } = buildVillainPrompt({}, "", seededRng(1), []);
    expect(userMessage).not.toContain("Domains used in this session");
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
      '```json\n{"title":"Vesk Ashgrave","conflictDomain":"Cosmic Incursion","content":"### Public Face\\ny","lore":"### Core Concept","labels":["villain"]}\n```';
    const out = parseVillainResponse(json, resolved);
    expect(out.title).toBe("Vesk Ashgrave");
    expect(out.content).toContain("Public Face");
    expect(out.type).toBe("character");
    expect(out.conflictDomain).toBe("Cosmic Incursion");
  });

  it("falls back to the resolved name and throws on bad JSON", () => {
    const out = parseVillainResponse('{"content":"x","lore":"y"}', resolved);
    expect(out.title).toBe(resolved.villainName);
    expect(out.conflictDomain).toBeUndefined();
    expect(() => parseVillainResponse("nope", resolved)).toThrow();
  });
});
