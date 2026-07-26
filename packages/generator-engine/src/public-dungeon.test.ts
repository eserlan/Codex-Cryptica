import { describe, expect, it } from "vitest";
import {
  buildDungeonPrompt,
  dungeonConfig,
  generateDungeonLocal,
  parseDungeonResponse,
} from "./public-dungeon";
import {
  getGenerator,
  isSupportedGenerator,
  listGenerators,
  resolveEntityType,
} from "./campaign-generator-registry";
import { NAME_BAN_PROMPT } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("dungeonConfig", () => {
  it("provides non-empty configuration options without hardcoded genre selects", () => {
    expect(dungeonConfig.purposes.length).toBeGreaterThan(0);
    expect(dungeonConfig.currentStates.length).toBeGreaterThan(0);
    expect(dungeonConfig.scales.length).toBeGreaterThan(0);
  });
});

describe("generateDungeonLocal", () => {
  it("generates a structured dungeon concept with narrative in content and GM reference in lore", () => {
    const out = generateDungeonLocal({}, seededRng(42));
    expect(out.title).toBeTruthy();
    expect(out.summary).toContain(out.title);
    expect(out.content).toContain("## History & Original Purpose");
    expect(out.content).toContain("## Current State & Function");
    expect(out.content).toContain("## Signature Feature");
    expect(out.content).toContain("## Current Conflict");
    expect(out.content).toContain("## Key Sectors & Layout");
    expect(out.content).toContain("## Inhabitants & Factions");
    expect(out.lore).toContain("### Dungeon Layout");
    expect(out.lore).toContain("### Central Secret / Boss Mystery");
    expect(out.lore).toContain("### Hazards & Traps");
    expect(out.lore).toContain("### Treasures & Artifacts");
    expect(out.lore).toContain("### Adventure Hooks & Rumours");
    expect(out.labels).toContain("dungeon");
    expect(out.labels).toContain("location");
  });

  it("does not duplicate the document between content and lore", () => {
    const out = generateDungeonLocal({}, seededRng(3));
    expect(out.content).not.toContain("### Central Secret / Boss Mystery");
    expect(out.lore).not.toContain("## History & Original Purpose");
  });

  it("respects themeId from campaign context for Sci-Fi theme", () => {
    const out = generateDungeonLocal(
      {
        themeId: "scifi",
        purpose: "Research Facility",
        currentState: "Arcane / Tech Anomaly",
        scale: "Small Lair (1-2 Sectors)",
      },
      seededRng(100),
    );
    expect(out.labels).toContain("sci-fi-space-opera");
    expect(out.labels).toContain("research-facility");
    expect(out.content).toContain("## Signature Feature");
    expect(out.content).toContain("## Current Conflict");
  });

  function sectorCount(content: string): number {
    return (content.match(/### Sector \d+:/g) ?? []).length;
  }

  it("generates a sector count matching each scale's documented range", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const small = generateDungeonLocal(
        { scale: "Small Lair (1-2 Sectors)" },
        seededRng(seed),
      );
      expect(sectorCount(small.content)).toBeGreaterThanOrEqual(1);
      expect(sectorCount(small.content)).toBeLessThanOrEqual(2);

      const medium = generateDungeonLocal(
        { scale: "Medium Complex (3-4 Sectors)" },
        seededRng(seed + 100),
      );
      expect(sectorCount(medium.content)).toBeGreaterThanOrEqual(3);
      expect(sectorCount(medium.content)).toBeLessThanOrEqual(4);

      const sprawling = generateDungeonLocal(
        { scale: "Sprawling Megadungeon (5+ Sectors)" },
        seededRng(seed + 200),
      );
      expect(sectorCount(sprawling.content)).toBeGreaterThanOrEqual(5);
    }
  });

  it("never doubles the sector name (e.g. 'Sector 1: Sector 1: ...')", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const out = generateDungeonLocal(
        { scale: "Sprawling Megadungeon (5+ Sectors)" },
        seededRng(seed),
      );
      expect(out.content).not.toMatch(/### Sector \d+: Sector \d+:/);
    }
  });

  it("derives inhabitants and current conflict from the same two named factions", () => {
    const out = generateDungeonLocal({}, seededRng(7));
    const factionsSection = out.content.split("## Inhabitants & Factions")[1];
    const names = [...factionsSection.matchAll(/- \*\*(.+?)\*\* —/g)].map(
      (m) => m[1],
    );
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);

    const conflictSection = out.content
      .split("## Current Conflict")[1]
      .split("## Key Sectors & Layout")[0]
      .toLowerCase();
    for (const name of names) {
      expect(conflictSection).toContain(name.toLowerCase());
    }
  });

  it("gives the two factions distinct goals and obstacles, not reskins of each other", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = generateDungeonLocal({}, seededRng(seed));
      const bullets = [
        ...out.content.matchAll(
          /- \*\*(.+?)\*\* — .+?\. Seeks (.+?); held back by (.+?)\./g,
        ),
      ];
      expect(bullets).toHaveLength(2);
      expect(bullets[0][2]).not.toBe(bullets[1][2]);
      expect(bullets[0][3]).not.toBe(bullets[1][3]);
    }
  });

  it("draws faction names from a pool wide enough to avoid one name dominating", () => {
    // FACTION_NAMES_BY_GENRE has 10 entries per genre; over 30 draws we should
    // see well more than half of them, not just the same one or two repeating.
    const seenNames = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const out = generateDungeonLocal({}, seededRng(seed));
      const names = [...out.content.matchAll(/- \*\*(.+?)\*\* — /g)].map(
        (m) => m[1],
      );
      for (const name of names) seenNames.add(name);
    }
    expect(seenNames.size).toBeGreaterThanOrEqual(6);
  });

  it("does not repeat a stock detail within the same bucket type unless the pool is exhausted", () => {
    // INHABITANTS/HAZARDS/HOOKS/SIGNATURE_FEATURES_BY_GENRE all have 5 entries
    // per genre; the global pick (hooks/hazards/signatureFeature) also
    // occupies one Lore/Trap/Special slot before sectors are stocked.
    const POOL_SIZE: Record<string, number> = {
      Monster: 5,
      Lore: 4,
      Special: 4,
      Trap: 4,
    };
    for (let seed = 1; seed <= 20; seed++) {
      const out = generateDungeonLocal(
        { scale: "Sprawling Megadungeon (5+ Sectors)" },
        seededRng(seed),
      );
      const stockLines = [
        ...out.content.matchAll(/\*(Monster|Lore|Special|Trap) — (.+?)\*/g),
      ];
      const byType: Record<string, string[]> = {};
      for (const [, type, detail] of stockLines) {
        (byType[type] ??= []).push(detail);
      }
      for (const [type, details] of Object.entries(byType)) {
        if (details.length <= POOL_SIZE[type]) {
          expect(new Set(details).size).toBe(details.length);
        }
      }
    }
  });

  it("never echoes the global hooks or hazards text verbatim inside a sector's stock detail", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = generateDungeonLocal(
        { scale: "Sprawling Megadungeon (5+ Sectors)" },
        seededRng(seed + 500),
      );
      const loreDetails = [...out.content.matchAll(/\*Lore — (.+?)\*/g)].map(
        (m) => m[1],
      );
      const trapDetails = [...out.content.matchAll(/\*Trap — (.+?)\*/g)].map(
        (m) => m[1],
      );
      for (const detail of loreDetails) {
        expect(out.lore).not.toContain(
          `### Adventure Hooks & Rumours\n${detail}`,
        );
      }
      for (const detail of trapDetails) {
        expect(out.lore).not.toContain(`### Hazards & Traps\n${detail}`);
      }
    }
  });

  it("renders a dungeon layout list with one entry per sector", () => {
    const out = generateDungeonLocal(
      { scale: "Medium Complex (3-4 Sectors)" },
      seededRng(9),
    );
    expect(out.lore).toContain("### Dungeon Layout");
    const mapSection = out.lore
      .split("### Dungeon Layout")[1]
      .split("### Central Secret")[0];
    const steps = [...mapSection.matchAll(/^\d+\.\s/gm)];
    expect(steps.length).toBe(sectorCount(out.content));
  });

  it("stocks every sector with a Monster/Lore/Special/Trap detail", () => {
    const out = generateDungeonLocal(
      { scale: "Medium Complex (3-4 Sectors)" },
      seededRng(11),
    );
    const stockLines = [
      ...out.content.matchAll(/\*(Monster|Lore|Special|Trap) — .+?\*/g),
    ];
    expect(stockLines.length).toBe(sectorCount(out.content));
  });
});

describe("buildDungeonPrompt", () => {
  it("includes system instruction with anti-cliché name ban prompt", () => {
    const prompt = buildDungeonPrompt({ themeId: "horror" });
    expect(prompt.systemInstruction).toContain("You are a master worldbuilder");
    expect(prompt.systemInstruction).toContain(NAME_BAN_PROMPT);
  });

  it("formats user message with options, signature feature, conflict, and instructions", () => {
    const prompt = buildDungeonPrompt({
      themeId: "cyberpunk",
      instruction: "Include a rogue AI core",
    });
    expect(prompt.userMessage).toContain("Cyberpunk / Corporate");
    expect(prompt.userMessage).toContain("signatureFeature");
    expect(prompt.userMessage).toContain("currentConflict");
    expect(prompt.userMessage).toContain("Include a rogue AI core");
    expect(prompt.userMessage).toContain("Required JSON schema");
  });

  it("passes the locally-generated foundation through instead of discarding it", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.userMessage).toContain("Locally-generated foundation");
    expect(prompt.userMessage).toContain(prompt.resolved.history);
    expect(prompt.userMessage).toContain(prompt.resolved.currentConflict);
    for (const faction of prompt.resolved.factions) {
      expect(prompt.userMessage).toContain(faction.name);
    }
    prompt.resolved.sectors.forEach((sector, idx) => {
      // Quoted, not prefixed with "Sector N:" — otherwise a compliant AI that
      // "reuses the given name exactly" copies the ordinal into the name itself
      // and formatSector() doubles it (e.g. "Sector 1: Sector 1: ...").
      expect(prompt.userMessage).toContain(`"${sector.name}"`);
      expect(prompt.userMessage).not.toContain(
        `Sector ${idx + 1}: ${sector.name}`,
      );
    });
  });
});

describe("parseDungeonResponse", () => {
  it("parses valid JSON response into structured generator output", () => {
    const sampleJson = JSON.stringify({
      title: "The Cryo-Vault of Sector 7",
      summary: "An abandoned sub-surface laboratory harboring a sleeping AI.",
      history: "Built by Aegis Dynamics for black-budget neural testing.",
      currentState: "Currently locked down under legacy defense routines.",
      signatureFeature: "The Sub-Zero Server Monolith venting nitrogen vapor.",
      currentConflict: "Net-scrapper squatters are battling corporate turrets.",
      sectors: [
        {
          name: "Decontamination Lock",
          description: "Pressurized entry hall.",
        },
        {
          name: "Mainframe Core",
          description: "Black server banks in liquid nitrogen.",
        },
      ],
      inhabitants: "Automated defense turrets and rogue cyber-drones.",
      secret: "The AI possesses the master overrides to the planetary grid.",
      hazards: "High-voltage electrical arcs and laser grid traps.",
      treasures: "Encrypted memory crystal with 50,000 corporate credits.",
      hooks: "A fix-it netrunner hires the crew to recover the memory crystal.",
    });

    const out = parseDungeonResponse(sampleJson, { themeId: "cyberpunk" });
    expect(out.title).toBe("The Cryo-Vault of Sector 7");
    expect(out.summary).toBe(
      "An abandoned sub-surface laboratory harboring a sleeping AI.",
    );
    expect(out.content).toContain("## History & Original Purpose");
    expect(out.content).toContain("Built by Aegis Dynamics");
    expect(out.content).toContain("## Signature Feature");
    expect(out.content).toContain("Sub-Zero Server Monolith");
    expect(out.content).toContain("## Current Conflict");
    expect(out.content).toContain("Net-scrapper squatters");
    expect(out.content).toContain("### Sector 1: Decontamination Lock");
    expect(out.content).toContain("### Sector 2: Mainframe Core");
    expect(out.lore).toContain("The AI possesses the master overrides");
    expect(out.content).not.toContain("The AI possesses the master overrides");
  });

  it("parses AI-provided factions and per-sector stocking, rendering both", () => {
    const sampleJson = JSON.stringify({
      title: "The Cryo-Vault of Sector 7",
      summary: "An abandoned sub-surface laboratory harboring a sleeping AI.",
      history: "Built by Aegis Dynamics for black-budget neural testing.",
      currentState: "Currently locked down under legacy defense routines.",
      signatureFeature: "The Sub-Zero Server Monolith venting nitrogen vapor.",
      factions: [
        {
          name: "the Net-Scrapper Squatters",
          virtue: "Resourceful",
          vice: "Greedy",
          goal: "Wealth",
          obstacle: "corporate turrets",
        },
        {
          name: "the Corporate Erasure Squad",
          virtue: "Disciplined",
          vice: "Cruel",
          goal: "Destruction",
          obstacle: "a rogue AI core",
        },
      ],
      currentConflict:
        "The Net-Scrapper Squatters are battling the Corporate Erasure Squad for the mainframe.",
      sectors: [
        {
          name: "Decontamination Lock",
          description: "Pressurized entry hall.",
          stockType: "Trap",
          stockDetail: "Laser grid tripwires.",
        },
      ],
      inhabitants: "Both factions occupy opposite ends of the server row.",
      secret: "The AI possesses the master overrides to the planetary grid.",
      hazards: "High-voltage electrical arcs and laser grid traps.",
      treasures: "Encrypted memory crystal with 50,000 corporate credits.",
      hooks: "A fix-it netrunner hires the crew to recover the memory crystal.",
    });

    const out = parseDungeonResponse(sampleJson, { themeId: "cyberpunk" });
    expect(out.content).toContain("- **the Net-Scrapper Squatters**");
    expect(out.content).toContain("- **the Corporate Erasure Squad**");
    expect(out.content).toContain("*Trap — Laser grid tripwires.*");
    expect(out.lore).toContain("### Dungeon Layout");
  });

  it("strips a redundant lead-in phrase and trailing period an AI adds to an obstacle", () => {
    const sampleJson = JSON.stringify({
      title: "T",
      summary: "S",
      factions: [
        {
          name: "the Testers",
          virtue: "Bold",
          vice: "Reckless",
          goal: "Knowledge",
          obstacle: "Held back by a rival faction sharing these halls.",
        },
        {
          name: "the Others",
          virtue: "Wise",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "struggling against an ancient guardian.",
        },
      ],
      sectors: [],
    });

    const out = parseDungeonResponse(sampleJson, {});
    expect(out.content).toContain(
      "held back by a rival faction sharing these halls.",
    );
    expect(out.content).toContain("held back by an ancient guardian.");
    expect(out.content).not.toMatch(/held back by held back by/i);
    expect(out.content).not.toMatch(/held back by struggling against/i);
    expect(out.content).not.toContain("halls..");
  });

  it("strips a redundant 'Seeks' lead-in an AI adds to a goal", () => {
    const sampleJson = JSON.stringify({
      title: "T",
      summary: "S",
      factions: [
        {
          name: "the Testers",
          virtue: "Bold",
          vice: "Reckless",
          goal: "Seeks Survival",
          obstacle: "a rival faction",
        },
        {
          name: "the Others",
          virtue: "Wise",
          vice: "Cruel",
          goal: "Seeking Ascension.",
          obstacle: "an ancient guardian",
        },
      ],
      sectors: [],
    });

    const out = parseDungeonResponse(sampleJson, {});
    expect(out.content).toContain("Seeks Survival;");
    expect(out.content).toContain("Seeks Ascension;");
    expect(out.content).not.toMatch(/seeks seeks/i);
    expect(out.content).not.toMatch(/seeks seeking/i);
  });

  it("falls back to local generation on invalid JSON input", () => {
    const out = parseDungeonResponse("Malformed non-json response text", {
      themeId: "fantasy",
    });
    expect(out.title).toBeTruthy();
    expect(out.content).toContain("## Key Sectors & Layout");
    expect(out.labels).toContain("dungeon");
  });
});

describe("Campaign Generator Registry Integration", () => {
  it("recognizes dungeon as a supported generator", () => {
    expect(isSupportedGenerator("dungeon")).toBe(true);
  });

  it("retrieves the dungeon generator definition from registry with purpose, currentState, and scale options", () => {
    const def = getGenerator("dungeon");
    expect(def.id).toBe("dungeon");
    expect(def.label).toBe("Dungeon / Delve");
    expect(def.entityType).toBe("location");
    const optionIds = def.options.map((o) => o.id);
    expect(optionIds).toContain("purpose");
    expect(optionIds).toContain("currentState");
    expect(optionIds).toContain("scale");
    expect(optionIds).not.toContain("genre");
  });

  it("includes dungeon in listGenerators() output", () => {
    const list = listGenerators();
    expect(list.some((g) => g.id === "dungeon")).toBe(true);
  });

  it("resolves dungeon entity type to location", () => {
    expect(resolveEntityType("dungeon")).toBe("location");
    expect(
      resolveEntityType("dungeon", ["location", "character", "item"]),
    ).toBe("location");
  });
});
