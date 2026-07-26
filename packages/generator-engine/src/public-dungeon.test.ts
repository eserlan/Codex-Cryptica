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
  it("generates a structured dungeon concept with all key sections including signature feature and current conflict", () => {
    const out = generateDungeonLocal({}, seededRng(42));
    expect(out.title).toBeTruthy();
    expect(out.summary).toContain(out.title);
    expect(out.lore).toContain("## History & Original Purpose");
    expect(out.lore).toContain("## Current State & Function");
    expect(out.lore).toContain("## Signature Feature");
    expect(out.lore).toContain("## Current Conflict");
    expect(out.lore).toContain("## Key Sectors & Layout");
    expect(out.lore).toContain("## Inhabitants & Factions");
    expect(out.lore).toContain("## Central Secret / Boss Mystery");
    expect(out.lore).toContain("## Hazards & Traps");
    expect(out.lore).toContain("## Treasures & Artifacts");
    expect(out.lore).toContain("## Adventure Hooks & Rumours");
    expect(out.labels).toContain("dungeon");
    expect(out.labels).toContain("location");
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
    expect(out.lore).toContain("## Signature Feature");
    expect(out.lore).toContain("## Current Conflict");
  });

  function sectorCount(lore: string): number {
    return (lore.match(/### Sector \d+:/g) ?? []).length;
  }

  it("generates a sector count matching each scale's documented range", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const small = generateDungeonLocal(
        { scale: "Small Lair (1-2 Sectors)" },
        seededRng(seed),
      );
      expect(sectorCount(small.lore)).toBeGreaterThanOrEqual(1);
      expect(sectorCount(small.lore)).toBeLessThanOrEqual(2);

      const medium = generateDungeonLocal(
        { scale: "Medium Complex (3-4 Sectors)" },
        seededRng(seed + 100),
      );
      expect(sectorCount(medium.lore)).toBeGreaterThanOrEqual(3);
      expect(sectorCount(medium.lore)).toBeLessThanOrEqual(4);

      const sprawling = generateDungeonLocal(
        { scale: "Sprawling Megadungeon (5+ Sectors)" },
        seededRng(seed + 200),
      );
      expect(sectorCount(sprawling.lore)).toBeGreaterThanOrEqual(5);
    }
  });

  it("derives inhabitants and current conflict from the same two named factions", () => {
    const out = generateDungeonLocal({}, seededRng(7));
    const factionsSection = out.lore.split("## Inhabitants & Factions")[1];
    const names = [...factionsSection.matchAll(/- \*\*(.+?)\*\* —/g)].map(
      (m) => m[1],
    );
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);

    const conflictSection = out.lore
      .split("## Current Conflict")[1]
      .split("## Dungeon Layout")[0]
      .toLowerCase();
    for (const name of names) {
      expect(conflictSection).toContain(name.toLowerCase());
    }
  });

  it("renders a dungeon layout map with one node per sector", () => {
    const out = generateDungeonLocal(
      { scale: "Medium Complex (3-4 Sectors)" },
      seededRng(9),
    );
    expect(out.lore).toContain("## Dungeon Layout");
    const mapSection = out.lore.split("## Dungeon Layout")[1].split("```")[1];
    const nodeRefs = [...mapSection.matchAll(/\[\d+\]/g)];
    expect(nodeRefs.length).toBeGreaterThanOrEqual(sectorCount(out.lore));
  });

  it("stocks every sector with a Monster/Lore/Special/Trap detail", () => {
    const out = generateDungeonLocal(
      { scale: "Medium Complex (3-4 Sectors)" },
      seededRng(11),
    );
    const stockLines = [
      ...out.lore.matchAll(/\*(Monster|Lore|Special|Trap) — .+?\*/g),
    ];
    expect(stockLines.length).toBe(sectorCount(out.lore));
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
    for (const sector of prompt.resolved.sectors) {
      expect(prompt.userMessage).toContain(sector.name);
    }
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
    expect(out.lore).toContain("## History & Original Purpose");
    expect(out.lore).toContain("Built by Aegis Dynamics");
    expect(out.lore).toContain("## Signature Feature");
    expect(out.lore).toContain("Sub-Zero Server Monolith");
    expect(out.lore).toContain("## Current Conflict");
    expect(out.lore).toContain("Net-scrapper squatters");
    expect(out.lore).toContain("### Sector 1: Decontamination Lock");
    expect(out.lore).toContain("### Sector 2: Mainframe Core");
    expect(out.lore).toContain("The AI possesses the master overrides");
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
    expect(out.lore).toContain("- **the Net-Scrapper Squatters**");
    expect(out.lore).toContain("- **the Corporate Erasure Squad**");
    expect(out.lore).toContain("*Trap — Laser grid tripwires.*");
    expect(out.lore).toContain("## Dungeon Layout");
  });

  it("falls back to local generation on invalid JSON input", () => {
    const out = parseDungeonResponse("Malformed non-json response text", {
      themeId: "fantasy",
    });
    expect(out.title).toBeTruthy();
    expect(out.lore).toContain("## Key Sectors & Layout");
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
