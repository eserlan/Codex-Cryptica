import { describe, expect, it } from "vitest";
import {
  buildPantheonPrompt,
  generatePantheonLocal,
  pantheonConfig,
  parsePantheonResponse,
} from "./public-pantheon";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("generatePantheonLocal", () => {
  it("returns a single deity structure", () => {
    const out = generatePantheonLocal(
      { mode: "single", domain: "Light" },
      seededRng(5),
    );
    expect(out.type).toBe("character");
    expect(out.content).toContain("### Deity Description");
    expect(out.lore).toContain("### Rituals & Taboos");
    expect(out.labels).toContain("deity-generator");
  });

  it("returns a full pantheon structure", () => {
    const out = generatePantheonLocal(
      {
        mode: "pantheon",
        width: "focused",
        domain: "Nature",
        campaignContext: "a forest realm split by holy war",
      },
      seededRng(2),
    );
    expect(out.type).toBe("faction");
    expect(out.summary).toContain("nature");
    expect(out.content).toContain("forest realm");
    expect(out.lore).toContain("### Deities of the Pantheon");
    expect(out.labels).toContain("pantheon-generator");
  });

  it("is deterministic for a fixed seed", () => {
    expect(generatePantheonLocal({ mode: "pantheon" }, seededRng(9))).toEqual(
      generatePantheonLocal({ mode: "pantheon" }, seededRng(9)),
    );
  });
});

describe("buildPantheonPrompt", () => {
  it("builds single deity prompts with ban prompt and session context", () => {
    const { systemInstruction, userMessage, resolved } = buildPantheonPrompt(
      { mode: "single", genre: "Classic Fantasy", domain: "War" },
      "- Existing: The Ash Saint (character)",
      seededRng(4),
    );
    expect(systemInstruction).toContain("single deities");
    expect(userMessage).toContain(NAME_BAN_PROMPT);
    expect(userMessage).toContain("The Ash Saint");
    expect(userMessage).toContain("- Primary Domain: War");
    expect(resolved.mode).toBe("single");
  });

  it("keeps width-specific pantheon scope text", () => {
    expect(
      buildPantheonPrompt(
        { mode: "pantheon", width: "balanced", domain: "Nature" },
        "",
        seededRng(1),
      ).userMessage,
    ).toContain(
      "Domain Scope: Central Theme Pantheon: create a diverse pantheon, but make Nature the central force, sacred obsession, source of crisis, or highest divine authority.",
    );
    expect(
      buildPantheonPrompt(
        { mode: "pantheon", width: "wide", domain: "Nature" },
        "",
        seededRng(1),
      ).userMessage,
    ).toContain(
      "Domain Scope: Wide Mythic Pantheon: create a broad pantheon with many different divine domains",
    );
  });

  it("keeps the public config data", () => {
    expect(pantheonConfig.domains).toContain("Arcana");
    expect(pantheonConfig.sizes.map((s) => s.value)).toContain("large");
  });
});

describe("parsePantheonResponse", () => {
  it("parses single deity JSON", () => {
    const out = parsePantheonResponse(
      '```json\n{"title":"Solaris","summary":"x","content":"### Deity Description","lore":"### At a Glance","labels":["custom"]}\n```',
      { mode: "single", generatedDeityName: "Fallback" },
    );
    expect(out.type).toBe("character");
    expect(out.title).toBe("Solaris");
    expect(out.labels).toContain("custom");
  });

  it("shapes structured pantheon JSON into content and lore", () => {
    const out = parsePantheonResponse(
      JSON.stringify({
        title: "The Crowned Nine",
        summary: "x",
        meta: {
          conflict_theme: "Betrayal",
          worshippers: "State Religion",
          hidden_problem: "The crown is cracked",
          immediate_hook: "A saint vanishes",
        },
        history: {
          origin_and_dogma: "Born from a broken oath.",
          structure_and_laws: "Each god holds one crown shard.",
        },
        deities: [
          { name: "A", description: "first", portfolio: "law" },
          { name: "B", description: "second", portfolio: "war" },
        ],
        relationships: [
          {
            deity_a: "A",
            deity_b: "B",
            relationship_type: "rivalry",
            campaign_pressure: "temples split",
          },
        ],
        culture: { clergy_roles: "judges" },
        campaign_seeds: { rumors: ["The crown bleeds"] },
      }),
      { mode: "pantheon", generatedDeityName: "Fallback" },
    );
    expect(out.type).toBe("faction");
    expect(out.content).toContain("### Origin & Dogma");
    expect(out.content).toContain("A** and **B");
    expect(out.lore).toContain("The crown is cracked");
    expect(out.labels).toContain("pantheon-generator");
  });

  it("falls back to defaults and throws on invalid JSON", () => {
    expect(
      parsePantheonResponse('{"content":"x","lore":"y"}', {
        mode: "single",
        generatedDeityName: "Fallback",
      }).title,
    ).toBe("Fallback");
    expect(() =>
      parsePantheonResponse("nope", {
        mode: "pantheon",
        generatedDeityName: "Fallback",
      }),
    ).toThrow();
  });
});
