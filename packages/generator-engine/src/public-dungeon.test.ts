import { describe, expect, it } from "vitest";
import {
  buildDungeonPrompt,
  collectSessionNames,
  buildDungeonRetryMessage,
  parseDungeonResponseDetailed,
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

/** The narrative fields a complete AI response must supply. */
const NARRATIVE = {
  history: "h",
  currentState: "c",
  signatureFeature: "sf",
  currentConflict: "cc",
  inhabitants: "i",
  secret: "sec",
  hazards: "hz",
  treasures: "t",
  hooks: "hk",
};

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
        scale: "Small Lair (2 Sectors)",
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
        { scale: "Small Lair (2 Sectors)" },
        seededRng(seed),
      );
      expect(sectorCount(small.content)).toBe(2);

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

  it("never generates a single-sector dungeon, whatever the scale", () => {
    // Two rival factions and a navigable layout are generated unconditionally,
    // and neither means anything in one room.
    const scales = [...dungeonConfig.scales, "Some Custom Scale"];
    for (const scale of scales) {
      for (let seed = 1; seed <= 20; seed++) {
        const out = generateDungeonLocal({ scale }, seededRng(seed));
        expect(
          sectorCount(out.content),
          `${scale} seed ${seed}`,
        ).toBeGreaterThanOrEqual(2);
      }
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

  it("gives the two factions distinct virtue, vice, goal, and obstacle", () => {
    // Sharing any one of the four makes the pair read as one faction written
    // twice — two "greedy" factions was showing up in ~12% of dungeons.
    for (let seed = 1; seed <= 40; seed++) {
      const out = generateDungeonLocal({}, seededRng(seed));
      const bullets = [
        ...out.content.matchAll(
          /- \*\*(.+?)\*\* — (\w+), but (\w+)\. Seeks (.+?); held back by (.+?)\./g,
        ),
      ];
      expect(bullets).toHaveLength(2);
      for (const group of [1, 2, 3, 4, 5]) {
        expect(
          bullets[0][group],
          `factions share capture group ${group}`,
        ).not.toBe(bullets[1][group]);
      }
    }
  });

  it("derives the history's original use from the selected purpose", () => {
    // A mine must not be described as a reliquary: the history sentence has to
    // come from ORIGINAL_USE_BY_PURPOSE, not an independent per-genre roll.
    for (let seed = 1; seed <= 10; seed++) {
      const mine = generateDungeonLocal(
        { purpose: "Mine & Shafts" },
        seededRng(seed),
      );
      const history = mine.content
        .split("## History & Original Purpose")[1]
        .split("##")[0];
      expect(history).toMatch(/excavation|quarry|dig site|shaft network/);

      const tomb = generateDungeonLocal(
        { purpose: "Tomb & Catacomb" },
        seededRng(seed + 50),
      );
      const tombHistory = tomb.content
        .split("## History & Original Purpose")[1]
        .split("##")[0];
      expect(tombHistory).toMatch(/burial vault|ossuary|catacomb|barrow/);
    }
  });

  it("derives the condition from the selected current state so they never contradict", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const sealed = generateDungeonLocal(
        { currentState: "Sealed Vault" },
        seededRng(seed),
      );
      const state = sealed.content
        .split("## Current State & Function")[1]
        .split("##")[0];
      expect(state).toContain("Sealed Vault —");
      // A sealed vault must not also be open to the weather or half-flooded.
      expect(state).toMatch(
        /airtight|shut from the inside|intact behind a door|preserved exactly/,
      );
      expect(state).not.toMatch(/open to the weather|half-flooded/);
    }
  });

  it("only offers purposes and states that suit the active genre", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const cyber = generateDungeonLocal(
        { themeId: "cyberpunk" },
        seededRng(seed),
      );
      // Fantasy-only purposes must never surface under a cyberpunk theme.
      expect(cyber.labels).not.toContain("temple-shrine");
      expect(cyber.labels).not.toContain("tomb-catacomb");
      expect(cyber.labels).not.toContain("planar-anomaly");
    }
  });

  it("falls back gracefully for a custom purpose or state with no dedicated table", () => {
    const out = generateDungeonLocal(
      { purpose: "Submerged Beacon", currentState: "Submerged in Brine" },
      seededRng(4),
    );
    expect(out.content).toContain("## History & Original Purpose");
    expect(out.content).toContain("Submerged in Brine —");
  });

  it("stocks Lore and Monster rooms from room-scale tables, not hooks or factions", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const out = generateDungeonLocal(
        { themeId: "lancer", scale: "Sprawling Megadungeon (5+ Sectors)" },
        seededRng(seed),
      );
      const globalHooks = out.lore
        .split("### Adventure Hooks & Rumours")[1]
        .trim();
      for (const [, detail] of out.content.matchAll(/\*Lore — (.+?)\*/g)) {
        // A Lore room holds findable evidence, not a GM-facing prompt.
        expect(globalHooks).not.toContain(detail);
        expect(detail).not.toMatch(
          /hires the party|wants .* audited|will pay/i,
        );
      }
      // A Monster room holds a room-scale threat, not one of the two factions
      // already named in Inhabitants & Factions.
      const factionNames = [...out.content.matchAll(/- \*\*(.+?)\*\* —/g)].map(
        (m) => m[1].replace(/^the /i, ""),
      );
      for (const [, detail] of out.content.matchAll(/\*Monster — (.+?)\*/g)) {
        for (const name of factionNames) {
          expect(detail).not.toContain(name);
        }
      }
    }
  });

  it("uses genre-appropriate faction obstacles", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const lancer = generateDungeonLocal(
        { themeId: "lancer" },
        seededRng(seed),
      );
      // Fantasy phrasing must not reach a hard sci-fi theme.
      expect(lancer.content).not.toMatch(/slow curse|ancient guardian/i);

      const fantasy = generateDungeonLocal(
        { themeId: "fantasy" },
        seededRng(seed),
      );
      expect(fantasy.content).not.toMatch(/reactor margin|Union inspection/i);
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

  it("requires the invented history to arrive at the fixed current state", () => {
    // The model authors the history now, so it can write an ending that
    // contradicts the state it was given — a delve "sealed permanently" with
    // "every human executed" that is nonetheless an occupied stronghold with
    // human sentinels and two factions fighting inside. This is a prompt-level
    // constraint only; there is no code check that the prose is coherent.
    const prompt = buildDungeonPrompt({
      themeId: "cyberpunk",
      currentState: "Occupied Stronghold",
    });
    expect(prompt.systemInstruction).toContain(
      'Write the "throughline" field first',
    );
    expect(prompt.systemInstruction).toContain(
      "The Current State is a setting",
    );
    expect(prompt.userMessage).toContain('"throughline":');
    // The throughline is generated before the fields it constrains.
    expect(prompt.userMessage.indexOf('"throughline"')).toBeLessThan(
      prompt.userMessage.indexOf('"history"'),
    );
  });

  it("gives the AI seeds to interpret, not finished prose to echo", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    // The seeds (raw axes) are present...
    expect(prompt.userMessage).toContain("Creative seeds");
    expect(prompt.userMessage).toContain(prompt.resolved.builder);
    expect(prompt.userMessage).toContain(prompt.resolved.cause);
    expect(prompt.userMessage).toContain(prompt.resolved.condition);
    // ...but the composed local prose is deliberately withheld, so the model
    // writes its own rather than reproducing ours verbatim.
    expect(prompt.userMessage).not.toContain(prompt.resolved.history);
    expect(prompt.userMessage).not.toContain(prompt.resolved.currentConflict);
    expect(prompt.userMessage).not.toContain(prompt.resolved.secret);
    expect(prompt.userMessage).not.toContain(prompt.resolved.treasures);
    expect(prompt.userMessage).not.toContain(prompt.resolved.signatureFeature);
    for (const faction of prompt.resolved.factions) {
      expect(prompt.userMessage).not.toContain(faction.name);
    }
    for (const sector of prompt.resolved.sectors) {
      expect(prompt.userMessage).not.toContain(sector.name);
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

  it("rejects a response with the wrong sector count and ships the foundation", () => {
    const prompt = buildDungeonPrompt({
      themeId: "lancer",
      scale: "Sprawling Megadungeon (5+ Sectors)",
    });
    expect(prompt.resolved.sectors.length).toBeGreaterThanOrEqual(5);

    // One sector for a five-plus sector dungeon is not the dungeon the user
    // asked for, so the whole response is discarded.
    const short = JSON.stringify({
      title: "Model Title",
      summary: "S",
      sectors: [
        {
          name: "Only Room",
          description: "d",
          stockType: "Trap",
          stockDetail: "x",
        },
      ],
      factions: [
        {
          name: "A",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o1",
        },
        {
          name: "B",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Survival",
          obstacle: "o2",
        },
      ],
    });

    const out = parseDungeonResponse(short, {}, seededRng(1), prompt.resolved);
    const rendered = (out.content.match(/### Sector \d+:/g) ?? []).length;
    expect(rendered).toBe(prompt.resolved.sectors.length);
    expect(out.title).toBe(prompt.resolved.title);
    expect(out.content).not.toContain("Only Room");
  });

  it("rejects a response whose factions collapse into one", () => {
    // Scale pinned: an unpinned prompt can roll a one-sector lair, where a
    // duplicate-stock check has nothing to compare.
    const prompt = buildDungeonPrompt({
      themeId: "fantasy",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));

    const sameGoal = JSON.stringify({
      title: "Model Title",
      summary: "S",
      sectors,
      factions: [
        {
          name: "A",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o1",
        },
        {
          name: "B",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Wealth",
          obstacle: "o2",
        },
      ],
    });
    expect(
      parseDungeonResponse(sameGoal, {}, seededRng(1), prompt.resolved).title,
    ).toBe(prompt.resolved.title);

    const dupDetail = JSON.stringify({
      title: "Model Title",
      summary: "S",
      sectors: sectors.map((s) => ({ ...s, stockDetail: "identical" })),
      factions: [
        {
          name: "A",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o1",
        },
        {
          name: "B",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Survival",
          obstacle: "o2",
        },
      ],
    });
    expect(
      parseDungeonResponse(dupDetail, {}, seededRng(1), prompt.resolved).title,
    ).toBe(prompt.resolved.title);
  });

  it("reports why a response was rejected so the caller can retry", () => {
    const prompt = buildDungeonPrompt({
      themeId: "fantasy",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const short = JSON.stringify({
      title: "The Vault of Oakhaven",
      summary: "S",
      sectors: [{ name: "Only Room", description: "d" }],
      factions: [
        {
          name: "A",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o",
        },
        {
          name: "B",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Wealth",
          obstacle: "o",
        },
      ],
    });

    const result = parseDungeonResponseDetailed(
      short,
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems.join(" ")).toContain("sectors");
    expect(result.problems.join(" ")).toContain("same goal");
    expect(result.problems.join(" ")).toContain("Oakhaven");
    // The fallback is still there for a caller that cannot retry.
    expect(result.output.title).toBe(prompt.resolved.title);
  });

  it("reports malformed JSON as a retryable problem", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    const result = parseDungeonResponseDetailed(
      "not json at all",
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("not valid JSON");
    expect(result.output.title).toBe(prompt.resolved.title);
  });

  it("builds a retry message naming each problem", () => {
    const retry = buildDungeonRetryMessage("ORIGINAL PROMPT", [
      "expected 6 sectors, got 1",
      "both factions pursue the same goal",
    ]);
    expect(retry).toContain("ORIGINAL PROMPT");
    expect(retry).toContain("previous response was rejected");
    expect(retry).toContain("- expected 6 sectors, got 1");
    expect(retry).toContain("- both factions pursue the same goal");
  });

  it("returns no problems for a response that satisfies every invariant", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    const valid = JSON.stringify({
      title: "The Bruneth Deep",
      summary: "S",
      throughline: "Built, ruined, and now contested.",
      ...NARRATIVE,
      sectors: prompt.resolved.sectors.map((s, i) => ({
        name: `Room ${i + 1}`,
        description: "d",
        stockType: s.stockType,
        stockDetail: `detail ${i + 1}`,
      })),
      factions: [
        {
          name: "the First",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o1",
        },
        {
          name: "the Second",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Survival",
          obstacle: "o2",
        },
      ],
    });
    const result = parseDungeonResponseDetailed(
      valid,
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(result.problems).toEqual([]);
    expect(result.output.title).toBe("The Bruneth Deep");
  });

  it("tells the model which session names to avoid, and rejects reuse", () => {
    const avoidNames = ["The Obsidian Directorate", "Khaz-Mar"];
    const prompt = buildDungeonPrompt({
      themeId: "cyberpunk",
      scale: "Medium Complex (3-4 Sectors)",
      avoidNames,
    });
    expect(prompt.userMessage).toContain(
      "Already used elsewhere in this session",
    );
    for (const name of avoidNames) {
      expect(prompt.userMessage).toContain(name);
    }

    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const factions = [
      {
        name: "The Obsidian Directorate",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        name: "the Neon Sanctuary",
        virtue: "Wise",
        vice: "Greedy",
        goal: "Survival",
        obstacle: "o2",
      },
    ];
    const reused = JSON.stringify({
      title: "Fine Title",
      summary: "S",
      throughline: "Built, ruined, and now contested.",
      ...NARRATIVE,
      sectors,
      factions,
    });

    const result = parseDungeonResponseDetailed(
      reused,
      { avoidNames },
      seededRng(1),
      prompt.resolved,
    );
    expect(result.problems.join(" ")).toContain("already used elsewhere");
    expect(result.problems.join(" ")).toContain("Obsidian Directorate");
    expect(result.output.title).toBe(prompt.resolved.title);

    // The same response is fine in a session that has not used those names.
    expect(
      parseDungeonResponseDetailed(reused, {}, seededRng(1), prompt.resolved)
        .problems,
    ).toEqual([]);
  });

  it("omits the avoid-list section when the session is empty", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.userMessage).not.toContain("Already used elsewhere");
  });

  it("flags a rejected response so the UI can say the AI output was unusable", () => {
    // runWithAIFallback only stamps aiFallback when the model call throws. A
    // call that succeeds and is then rejected by validation used to be
    // indistinguishable from an ordinary local generation, so two consecutive
    // fully-local delves gave no clue the AI path had failed at all.
    const prompt = buildDungeonPrompt({ themeId: "sci-fi" });

    const structural = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "T",
        summary: "S",
        throughline: "T",
        ...NARRATIVE,
        sectors: [],
        factions: [],
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(structural.rejected).toBe(true);
    expect(structural.output.aiFallback).toBe(true);

    const malformed = parseDungeonResponseDetailed(
      "not json",
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(malformed.output.aiFallback).toBe(true);

    // A response that was actually used is not flagged.
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const ok = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "T",
        summary: "S",
        throughline: "T",
        ...NARRATIVE,
        sectors,
        factions: [
          {
            name: "the First",
            virtue: "Bold",
            vice: "Cruel",
            goal: "Wealth",
            obstacle: "o1",
          },
          {
            name: "the Second",
            virtue: "Wise",
            vice: "Greedy",
            goal: "Survival",
            obstacle: "o2",
          },
        ],
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(ok.rejected).toBe(false);
    expect(ok.output.aiFallback).toBeUndefined();
  });

  it("keeps the model's work for a content gap but discards it for a structural one", () => {
    // Conflating the two meant one skipped field cost the entire AI-authored
    // dungeon, replacing it with table prose — strictly worse than the single
    // substituted section the rejection was meant to prevent.
    const prompt = buildDungeonPrompt({
      themeId: "sci-fi",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Invented Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const factions = [
      {
        name: "the First",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        name: "the Second",
        virtue: "Wise",
        vice: "Greedy",
        goal: "Survival",
        obstacle: "o2",
      },
    ];
    const { hooks: _dropped, ...withoutHooks } = NARRATIVE;

    // Content gap: reported, but the response survives with the gap patched.
    const gap = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "The Invented Vault",
        summary: "S",
        throughline: "T",
        ...withoutHooks,
        sectors,
        factions,
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(gap.rejected).toBe(false);
    expect(gap.problems.join(" ")).toContain("hooks");
    expect(gap.output.title).toBe("The Invented Vault");
    expect(gap.output.content).toContain("Invented Room 1");
    expect(gap.output.lore).toContain("### Adventure Hooks & Rumours");

    // Structural violation: the response is not the dungeon that was asked for.
    const structural = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "The Invented Vault",
        summary: "S",
        throughline: "T",
        ...NARRATIVE,
        sectors: [sectors[0]],
        factions,
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(structural.rejected).toBe(true);
    expect(structural.output.title).toBe(prompt.resolved.title);
  });

  it("asks again for an omitted narrative field instead of substituting table prose", () => {
    // A delve came back whose Adventure Hooks were one flat sentence lifted
    // verbatim from the cyberpunk table, because the model omitted "hooks" and
    // the per-field fallback quietly filled it in. That reintroduces exactly
    // the local text this generator moved away from, so an omission is now a
    // problem the retry can name.
    const prompt = buildDungeonPrompt({
      themeId: "cyberpunk",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const factions = [
      {
        name: "the First",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        name: "the Second",
        virtue: "Wise",
        vice: "Greedy",
        goal: "Survival",
        obstacle: "o2",
      },
    ];
    const { hooks: _dropped, ...withoutHooks } = NARRATIVE;

    const result = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "Fine Title",
        summary: "S",
        throughline: "T",
        ...withoutHooks,
        sectors,
        factions,
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(result.problems.join(" ")).toContain("missing required fields");
    expect(result.problems.join(" ")).toContain("hooks");

    // The foundation is still the floor once the retry has had its chance.
    expect(result.output.lore).toContain("### Adventure Hooks & Rumours");
  });

  it("rejects a response that skipped the throughline planning step", () => {
    const prompt = buildDungeonPrompt({
      themeId: "cyberpunk",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const factions = [
      {
        name: "the First",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        name: "the Second",
        virtue: "Wise",
        vice: "Greedy",
        goal: "Survival",
        obstacle: "o2",
      },
    ];

    const noThroughline = JSON.stringify({
      title: "Fine Title",
      summary: "S",
      ...NARRATIVE,
      sectors,
      factions,
    });
    const result = parseDungeonResponseDetailed(
      noThroughline,
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(result.problems.join(" ")).toContain("throughline");
    // Rejection routes into the corrective retry rather than being accepted.
    expect(result.output.title).toBe(prompt.resolved.title);

    // With one present, the same response is fine.
    const withIt = JSON.stringify({
      title: "Fine Title",
      summary: "S",
      throughline: "Built as a vault, gutted by a purge, now contested.",
      ...NARRATIVE,
      sectors,
      factions,
    });
    expect(
      parseDungeonResponseDetailed(withIt, {}, seededRng(1), prompt.resolved)
        .problems,
    ).toEqual([]);
  });

  it("rejects AI-authored names drawn from the banned cliché list", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const factions = [
      {
        name: "A",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        name: "B",
        virtue: "Wise",
        vice: "Greedy",
        goal: "Survival",
        obstacle: "o2",
      },
    ];
    const base = {
      summary: "S",
      throughline: "T",
      ...NARRATIVE,
      sectors,
      factions,
    };

    // The ban list has only ever been a prompt request; these assert it is
    // actually enforced now that the model authors every name.
    const inTitle = JSON.stringify({ ...base, title: "The Vault of Oakhaven" });
    expect(
      parseDungeonResponse(inTitle, {}, seededRng(1), prompt.resolved).title,
    ).toBe(prompt.resolved.title);

    const inSector = JSON.stringify({
      ...base,
      title: "Fine Title",
      sectors: sectors.map((s, i) =>
        i === 0 ? { ...s, name: "Elara's Rest" } : s,
      ),
    });
    expect(
      parseDungeonResponse(inSector, {}, seededRng(1), prompt.resolved).title,
    ).toBe(prompt.resolved.title);

    const inFaction = JSON.stringify({
      ...base,
      title: "Fine Title",
      factions: [{ ...factions[0], name: "the Thorne Compact" }, factions[1]],
    });
    expect(
      parseDungeonResponse(inFaction, {}, seededRng(1), prompt.resolved).title,
    ).toBe(prompt.resolved.title);

    // A clean response is untouched.
    const clean = JSON.stringify({ ...base, title: "The Bruneth Deep" });
    expect(
      parseDungeonResponse(clean, {}, seededRng(1), prompt.resolved).title,
    ).toBe("The Bruneth Deep");
  });

  it("keeps a structurally valid response even though it invents every name", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    const valid = JSON.stringify({
      title: "The Wholly Invented Vault",
      summary: "A delve the model named itself.",
      throughline: "Built, ruined, and now contested.",
      history: "Model history.",
      currentState: "Model state.",
      signatureFeature: "Model feature.",
      currentConflict: "Model conflict.",
      sectors: prompt.resolved.sectors.map((s, i) => ({
        name: `Invented Room ${i + 1}`,
        description: `Invented description ${i + 1}.`,
        stockType: s.stockType,
        stockDetail: `Invented detail ${i + 1}.`,
      })),
      factions: [
        {
          name: "the Invented First",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o1",
        },
        {
          name: "the Invented Second",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Survival",
          obstacle: "o2",
        },
      ],
      inhabitants: "Model inhabitants.",
      secret: "Model secret.",
      hazards: "Model hazards.",
      treasures: "Model treasures.",
      hooks: "Model hooks.",
    });

    const out = parseDungeonResponse(valid, {}, seededRng(1), prompt.resolved);
    expect(out.title).toBe("The Wholly Invented Vault");
    expect(out.content).toContain("Invented Room 1");
    expect(out.content).toContain("the Invented First");
    expect(out.lore).toContain("Model secret.");
    // None of the local prose leaks through when the model supplied its own.
    expect(out.lore).not.toContain(prompt.resolved.secret);
    expect(out.content).not.toContain(prompt.resolved.sectors[0].name);
  });

  it("never drops a section when the AI omits its field", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    // A response with only the two mandatory fields — every other key absent,
    // which previously deleted those sections from the rendered document.
    const sparse = JSON.stringify({ title: "T", summary: "S" });

    const out = parseDungeonResponse(sparse, {}, seededRng(1), prompt.resolved);
    for (const heading of [
      "## History & Original Purpose",
      "## Current State & Function",
      "## Signature Feature",
      "## Current Conflict",
      "## Key Sectors & Layout",
      "## Inhabitants & Factions",
    ]) {
      expect(out.content, `missing ${heading}`).toContain(heading);
    }
    for (const heading of [
      "### Dungeon Layout",
      "### Central Secret / Boss Mystery",
      "### Hazards & Traps",
      "### Treasures & Artifacts",
      "### Adventure Hooks & Rumours",
    ]) {
      expect(out.lore, `missing ${heading}`).toContain(heading);
    }
    // The fallback text is the foundation's, not an empty heading.
    expect(out.lore).toContain(prompt.resolved.hooks);
    expect(out.lore).toContain(prompt.resolved.secret);
    expect(out.content).toContain(prompt.resolved.history);
  });

  it("fixes the structure the model must honour", () => {
    const prompt = buildDungeonPrompt({
      scale: "Medium Complex (3-4 Sectors)",
    });
    const n = prompt.resolved.sectors.length;
    expect(prompt.userMessage).toContain(`EXACTLY ${n} sectors`);
    expect(prompt.userMessage).toContain(`EXACTLY ${n} entries`);
    expect(prompt.userMessage).toContain("EXACTLY 2 factions");
    // The per-sector stock plan is mechanical and must reach the model.
    for (const sector of prompt.resolved.sectors) {
      expect(prompt.userMessage).toContain(sector.stockType as string);
    }
    // Both faction goals are fixed by the roll, not chosen by the model.
    for (const faction of prompt.resolved.factions) {
      expect(prompt.userMessage).toContain(faction.goal);
    }
  });

  it("strips quote marks an AI copies from the prompt into a sector name", () => {
    const sampleJson = JSON.stringify({
      title: "T",
      summary: "S",
      sectors: [
        { name: '"The Cold Bay"', description: "d" },
        { name: "Sector 2: The Printer Deck", description: "d" },
        { name: "“The Core Vault”", description: "d" },
      ],
    });

    const out = parseDungeonResponse(sampleJson, {});
    expect(out.content).toContain("### Sector 1: The Cold Bay");
    expect(out.content).toContain("### Sector 2: The Printer Deck");
    expect(out.content).toContain("### Sector 3: The Core Vault");
    expect(out.content).not.toMatch(/### Sector \d+: ["“]/);
    expect(out.content).not.toMatch(/### Sector \d+: Sector \d+:/);
    // The layout list is built from the same names, so it must be clean too.
    expect(out.lore).toContain("1. The Cold Bay");
    expect(out.lore).not.toMatch(/^\d+\. ["“]/m);
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

describe("collectSessionNames", () => {
  it("gathers titles and faction names, newest first, article stripped", () => {
    const names = collectSessionNames([
      { title: "First Delve", content: "- **the Iron Pact** — a, but b." },
      { title: "Second Delve", content: "- **The Ashen Choir** — a, but b." },
    ]);
    expect(names).toContain("First Delve");
    expect(names).toContain("Second Delve");
    // Leading article dropped so "the X" also blocks "X".
    expect(names).toContain("Iron Pact");
    expect(names).toContain("Ashen Choir");
    // Newest first.
    expect(names.indexOf("Ashen Choir")).toBeLessThan(
      names.indexOf("Iron Pact"),
    );
  });

  it("caps the list so a long session cannot balloon the prompt", () => {
    const entities = Array.from({ length: 50 }, (_, i) => ({
      title: `Delve ${i}`,
      content: "",
    }));
    expect(collectSessionNames(entities).length).toBeLessThanOrEqual(24);
  });

  it("ignores entities with no title or content", () => {
    expect(collectSessionNames([{}, { title: "  " }])).toEqual([]);
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
