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

  it("assigns distinct deity descriptions in medium/large pantheons and varies problems/hooks across seeds", () => {
    for (const width of ["balanced", "focused", "wide"] as const) {
      const out = generatePantheonLocal(
        { mode: "pantheon", size: "medium", width, domain: "Shadow" },
        seededRng(3),
      );
      const structureBlock =
        out.content.split("### Pantheon Structure\n")[1]?.split("\n\n")[0] ??
        "";
      const descriptions = structureBlock
        .split("\n")
        .filter((line) => /^\d+\./.test(line))
        .map((line) => line.replace(/^\d+\.\s+\*\*[^*]+\*\*:\s*/, ""));
      expect(descriptions.length).toBeGreaterThanOrEqual(5);
      expect(descriptions.length).toBeLessThanOrEqual(7);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    }

    const problems = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const out = generatePantheonLocal({ mode: "pantheon" }, seededRng(seed));
      const match = out.lore.match(/- \*\*Hidden Problem\*\*: ([^\n]+)/);
      if (match?.[1]) problems.add(match[1]);
    }
    expect(problems.size).toBeGreaterThan(1);
  });

  it("varies deity counts within Small (3-4), Medium (5-7), and Large (8-12) ranges and keeps relationships valid", () => {
    for (const [size, min, max] of [
      ["small", 3, 4],
      ["medium", 5, 7],
      ["large", 8, 12],
    ] as const) {
      const counts = new Set<number>();
      for (let seed = 1; seed <= 20; seed++) {
        const out = generatePantheonLocal(
          { mode: "pantheon", size, width: "wide" },
          seededRng(seed),
        );
        const countMatch = out.content.match(
          /The pantheon consists of (\d+) deities:/,
        );
        const count = Number(countMatch?.[1]);
        expect(count).toBeGreaterThanOrEqual(min);
        expect(count).toBeLessThanOrEqual(max);
        counts.add(count);

        const structureBlock =
          out.content.split("### Pantheon Structure\n")[1]?.split("\n\n")[0] ??
          "";
        const deityNames = structureBlock
          .split("\n")
          .filter((line) => /^\d+\./.test(line))
          .map((line) => line.match(/\*\*([^*]+)\*\*/)?.[1] ?? "");
        expect(new Set(deityNames).size).toBe(count);

        const relBlock =
          out.content
            .split("### Divine Alliances & Rivalries\n")[1]
            ?.split("\n\n")[0] ?? "";
        const relLines = relBlock.split("\n").filter((l) => l.startsWith("- "));
        expect(relLines.length).toBeGreaterThanOrEqual(count);
        for (const line of relLines) {
          const pair = line.match(/\*\*([^*]+)\*\* and \*\*([^*]+)\*\*/);
          expect(pair?.[1]).toBeTruthy();
          expect(pair?.[2]).toBeTruthy();
          expect(pair?.[1]).not.toBe(pair?.[2]);
          expect(deityNames).toContain(pair?.[1]);
          expect(deityNames).toContain(pair?.[2]);
        }

        expect(out.lore).toContain("- **Portfolio**:");
        expect(out.lore).toContain("- **Personality**:");
        expect(out.lore).toContain("- **Symbol**:");
        expect(out.lore).toContain("- **Taboo**:");
        expect(out.lore).toContain("- **Stance on Conflict**:");
      }
      expect(counts.size).toBeGreaterThan(1);
    }
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

  it("preserves full AI deity profiles, public dogma, omens, and cultural taboos without discarding fields", () => {
    const out = parsePantheonResponse(
      JSON.stringify({
        title: "The Iron Choir",
        summary: "War gods bound by an unspoken succession crisis.",
        meta: {
          conflict_theme: "Succession War",
          worshippers: "State Religion",
          public_dogma: "Victory belongs to whoever holds the oath.",
          hidden_problem: "The High General died centuries ago.",
          immediate_hook: "A border regiment refuses to disarm.",
        },
        history: {
          origin_and_dogma: "Forged in the first siege.",
          structure_and_laws: "Five marshals govern distinct aspects of war.",
        },
        deities: [
          {
            name: "Valken",
            description: "Lord of the Shieldwall.",
            appearance: "An armoured giant with a cracked visor.",
            portfolio: "Fortification and sieges",
            divine_role: "First Marshal",
            personality: "Stoic, unforgiving, patient.",
            common_worshippers: "Garrison captains",
            taboo: "Abandoning a wall before relief arrives.",
            symbol: "An iron gate key",
            worship_style: "Silent vigils before battle.",
            conflict_relation: "Refuses to name a successor.",
          },
        ],
        relationships: [
          {
            deity_a: "Valken",
            deity_b: "Sera",
            relationship_type: "Rivalry",
            campaign_pressure: "Garrisons refuse to share supply depots.",
          },
        ],
        culture: {
          clergy_roles: "Chaplains and quartermasters.",
          temples_and_shrines: "Bastion chapels.",
          common_rite: "Sharpening blades at dusk.",
          high_rite: "The Blood Muster.",
          omens: ["Rust blooming overnight on bronze"],
          taboos: ["Burying a coward in armour"],
        },
        campaign_seeds: { rumors: ["The vault holds old bones."] },
      }),
      { mode: "pantheon", generatedDeityName: "Fallback" },
    );

    expect(out.content).toContain("Victory belongs to whoever holds the oath.");
    expect(out.lore).toContain("#### Valken — First Marshal");
    expect(out.lore).toContain("An armoured giant with a cracked visor.");
    expect(out.lore).toContain("Stoic, unforgiving, patient.");
    expect(out.lore).toContain("An iron gate key");
    expect(out.lore).toContain(
      "Garrison captains — Silent vigils before battle.",
    );
    expect(out.lore).toContain("Abandoning a wall before relief arrives.");
    expect(out.lore).toContain("Refuses to name a successor.");
    expect(out.lore).toContain("Rust blooming overnight on bronze");
    expect(out.lore).toContain("Burying a coward in armour");
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
