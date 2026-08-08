import { describe, expect, it } from "vitest";
import {
  buildDungeonCoherencePrompt,
  buildDungeonPrompt,
  collectSessionNames,
  collectSessionTraits,
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
  factionSituation: "fs",
  secret: "sec",
  hazards: ["hz"],
  treasures: ["t"],
  hooks: ["hk"],
};

/**
 * The fields a complete AI faction entry must supply beyond
 * name/virtue/vice/goal/obstacle. `drive` is deliberately omitted so it falls
 * back to the foundation's own distinct per-faction value instead of
 * colliding between the two fixtures in a pair.
 */
const FACTION_FIELDS = {
  identity: "i",
  origin: "o",
  belief: "bel",
  territorySectorIds: [] as string[],
  strength: "st",
  leader: { name: "L", description: "ld" },
  notable: { name: "N", description: "nd" },
  relationship: "rel",
};

/**
 * Matches one rendered faction section end to end, capturing every field in
 * order: 1 name, 2 identity, 3 virtue, 4 vice, 5 goal, 6 drive, 7 obstacle,
 * 8 origin, 9 belief, 10 territory, 11 strength, 12 leader, 13 notable,
 * 14 relationship.
 */
const FACTION_BLOCK =
  /### (.+)\n\n\*\*Identity:\*\* (.+)\n\n(\w+), but (\w+)\.\n\n\*\*Goal:\*\* (.+)\n\*\*Drive:\*\* (.+)\n\*\*Obstacle:\*\* (.+)\n\n\*\*Origin:\*\* (.+)\n\*\*Belief:\*\* (.+)\n\n\*\*Territory:\*\* (.+)\n\*\*Strength:\*\* (.+)\n\n\*\*Leader:\*\* (.+)\n\*\*Notable:\*\* (.+)\n\n\*\*Relationship:\*\* (.+)/g;

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
    expect(out.content).toContain("## Key Sectors & Layout");
    expect(out.content).toContain("## Faction Situation");
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
    expect(out.content).toContain("## Faction Situation");
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

  it("derives the shared faction situation from the same two named factions", () => {
    const out = generateDungeonLocal({}, seededRng(7));
    const factionsSection = out.content.split("## Faction Situation")[1];
    const names = [...factionsSection.matchAll(/^### (.+)$/gm)].map(
      (m) => m[1],
    );
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);

    const situation = factionsSection.split("### ")[0].toLowerCase();
    for (const name of names) {
      expect(situation).toContain(name.toLowerCase());
    }
  });

  it("gives the two factions distinct virtue, vice, drive, and obstacle", () => {
    // Sharing any one of the four makes the pair read as one faction written
    // twice — two "greedy" factions was showing up in ~12% of dungeons.
    for (let seed = 1; seed <= 40; seed++) {
      const out = generateDungeonLocal({}, seededRng(seed));
      const factions = [...out.content.matchAll(FACTION_BLOCK)];
      expect(factions).toHaveLength(2);
      // Groups: 1 name, 3 virtue, 4 vice, 6 drive, 7 obstacle.
      for (const group of [1, 3, 4, 6, 7]) {
        expect(
          factions[0][group],
          `factions share capture group ${group}`,
        ).not.toBe(factions[1][group]);
      }
    }
  });

  it("gives each local faction a distinct goal, origin, belief, territory, leader, and notable NPC", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const out = generateDungeonLocal({}, seededRng(seed));
      const factions = [...out.content.matchAll(FACTION_BLOCK)];
      expect(factions).toHaveLength(2);
      for (const f of factions) {
        // Groups: 2 identity, 5 goal, 7 obstacle, 8 origin, 9 belief,
        // 10 territory, 11 strength, 12 leader, 13 notable, 14 relationship.
        for (const group of [2, 5, 7, 8, 9, 10, 11, 12, 13, 14]) {
          expect(f[group].trim()).not.toBe("");
        }
      }
    }
  });

  it("gives each local faction a strategy-shaped relationship, not a restated dependency", () => {
    // Relationship must describe attitude/strategy/planned response — the
    // shared mutual dependency is factionSituation's job, not this field's.
    const STRATEGY_MARKERS =
      /stalling|preparing to strike|negotiate|nuisance|gathering intelligence|written .* off|probe/i;
    for (let seed = 1; seed <= 15; seed++) {
      const out = generateDungeonLocal({}, seededRng(seed));
      const factions = [...out.content.matchAll(FACTION_BLOCK)];
      for (const f of factions) {
        const relationship = f[14];
        expect(relationship, `seed ${seed}`).toMatch(STRATEGY_MARKERS);
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
      // already named in the Faction Situation.
      const factionNames = [
        ...out.content.matchAll(/^### (?!Sector \d+:)(.+)$/gm),
      ].map((m) => m[1].replace(/^the /i, ""));
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
      const names = [
        ...out.content.matchAll(/^### (?!Sector \d+:)(.+)$/gm),
      ].map((m) => m[1]);
      for (const name of names) seenNames.add(name);
    }
    expect(seenNames.size).toBeGreaterThanOrEqual(6);
  });

  it("does not repeat a stock detail within the same bucket type unless the pool is exhausted", () => {
    // INHABITANTS/HAZARDS/HOOKS/SIGNATURE_FEATURES_BY_GENRE all have 5 entries
    // per genre. The global pick occupies some of that pool before sectors are
    // stocked: hooks/hazards each draw 2-3 items (worst case 3), leaving as few
    // as 2 free for Lore/Trap; signatureFeature always draws exactly 1, leaving
    // 4 free for Special. Monster draws from a separate table untouched by any
    // global pick.
    const POOL_SIZE: Record<string, number> = {
      Monster: 5,
      Lore: 2,
      Special: 4,
      Trap: 2,
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
    expect(prompt.userMessage).toContain("factionSituation");
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
      'Write the "throughline" field before factionSituation',
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
    // writes its own rather than reproducing ours verbatim. The secret stays
    // withheld too, since it's the AI's own twist to invent.
    expect(prompt.userMessage).not.toContain(prompt.resolved.history);
    expect(prompt.userMessage).not.toContain(prompt.resolved.factionSituation);
    expect(prompt.userMessage).not.toContain(prompt.resolved.secret);
    for (const faction of prompt.resolved.factions) {
      expect(prompt.userMessage).not.toContain(faction.name);
    }
    for (const sector of prompt.resolved.sectors) {
      expect(prompt.userMessage).not.toContain(sector.name);
    }
  });

  it("locks in the signature feature, hazards, and treasures as facts factions must not contradict", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.userMessage).toContain("Already-established facts");
    expect(prompt.userMessage).toContain(prompt.resolved.signatureFeature);
    for (const t of prompt.resolved.treasures) {
      expect(prompt.userMessage).toContain(t);
    }
    for (const h of prompt.resolved.hazards) {
      expect(prompt.userMessage).toContain(h);
    }
  });

  it("gives the model each sector's fixed id before it names any of them", () => {
    const prompt = buildDungeonPrompt({
      themeId: "fantasy",
      scale: "Medium Complex (3-4 Sectors)",
    });
    for (const sector of prompt.resolved.sectors) {
      expect(prompt.userMessage).toContain(sector.id);
    }
    expect(prompt.userMessage).toContain("territorySectorIds");
  });

  it("asks for secret, hazards, and treasures before the faction situation and factions", () => {
    // The schema's field order is the model's write order — asking for
    // hazards/treasures/secret after factions let a faction reference an
    // artifact the model hadn't invented yet at that point in its own output.
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    const schema = prompt.userMessage;
    const idx = (key: string) => schema.indexOf(`"${key}"`);
    expect(idx("secret")).toBeGreaterThan(0);
    expect(idx("hazards")).toBeGreaterThan(idx("secret"));
    expect(idx("treasures")).toBeGreaterThan(idx("hazards"));
    expect(idx("factionSituation")).toBeGreaterThan(idx("treasures"));
    expect(idx("factions")).toBeGreaterThan(idx("factionSituation"));
  });

  it("tells the model treasures must fit who built the delve and obstacles must not invent a new mystery", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toContain(
      "Treasures must fit who built this delve",
    );
    expect(prompt.systemInstruction).toContain(
      "a second mystery competing with the one you already wrote",
    );
    expect(prompt.systemInstruction).toContain(
      "unless that people or craft is actually named somewhere in the history",
    );
  });

  it("requires an entity-ownership/dependency check: no claiming what you're still trying to get", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    // Goal must not ask to acquire something Strength/Territory/situation already grants.
    expect(prompt.systemInstruction).toContain(
      'if Strength says they hold the strongbox, Goal cannot also be "secure the strongbox."',
    );
    // A faction shouldn't chase something already in its own territory unexplained.
    expect(prompt.systemInstruction).toContain(
      "a faction should not seek to acquire something already sitting inside its own Territory",
    );
    // Obstacle must actually block Goal from where Territory places the faction.
    expect(prompt.systemInstruction).toContain(
      "it must actually stand between this faction and its Goal from where its Territory places it",
    );
    // factionSituation must still hold once checked against the finished factions.
    expect(prompt.systemInstruction).toContain(
      "re-check factionSituation once more against their actual Territory, Goal, Strength, and Relationship",
    );
    // Relationship must not contradict Obstacle.
    expect(prompt.systemInstruction).toContain(
      "It also must not contradict Obstacle",
    );
    // factionSituation shouldn't force fake mutual symmetry.
    expect(prompt.systemInstruction).toContain(
      "do not force artificial symmetry",
    );
  });

  it("requires Drive to naturally explain this faction's Identity and Goal, and Strength to not cancel its own Obstacle", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toContain(
      "Drive must naturally explain this faction's Identity and Goal",
    );
    expect(prompt.systemInstruction).toContain(
      "Test it by swapping the Drive for a different one",
    );
    expect(prompt.systemInstruction).toContain(
      "If Drive is Vengeance, the Identity, Goal, and Belief should all read as someone settling a score",
    );
    // Strength may ease its own Obstacle but must not cancel it outright.
    expect(prompt.systemInstruction).toContain(
      "Strength may take the edge off this faction's own Obstacle, but must not cancel it outright",
    );
    // factionSituation and Goal must agree on why an item is needed.
    expect(prompt.systemInstruction).toContain(
      'a scroll cache introduced as a weapon against a monster cannot become "research material for antidotes" once you reach that faction\'s Goal',
    );
  });

  it("requires a treasure, hazard, or creature's claimed sector to match the sector that actually establishes it", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toContain(
      "is that the same sector whose own Lore/stockDetail/Monster entry actually establishes it?",
    );
    expect(prompt.systemInstruction).toContain(
      "Never relocate a treasure or hazard to a different sector, never invent a creature or threat for a sector beyond what its own entry establishes",
    );
  });

  it("forbids inventing new capabilities for an item beyond its own established description", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toContain(
      "does every later mention of it stick to that same description, with no new power added on top?",
    );
  });

  it("requires Drive to fit Identity as well as Goal", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toContain(
      "Does Drive explain why this faction wants its Goal, and fit its Identity too",
    );
  });

  it("requires non-adjacent faction territory to have an established route or explanation", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toContain(
      "If this faction's own Territory spans two non-adjacent sectors, is there an established shortcut connecting them, or does the text explain how it holds both despite the gap?",
    );
  });

  it("closes with a tight per-faction checklist covering ownership, situation-goal agreement, obstacle plausibility, and drive-vs-pressure", () => {
    const prompt = buildDungeonPrompt({ themeId: "fantasy" });
    // Already-controls-it check.
    expect(prompt.systemInstruction).toContain(
      "given this faction's Territory, and everything the sector(s) in it already establish",
    );
    expect(prompt.systemInstruction).toContain(
      "Does Goal name something outside that list of already-controlled things?",
    );
    // factionSituation must match the faction's own Goal.
    expect(prompt.systemInstruction).toContain(
      "Does factionSituation actually describe this faction's own Goal",
    );
    // Relationship must involve the rival specifically.
    expect(prompt.systemInstruction).toContain(
      "Does Relationship describe a strategy or attitude toward the rival faction specifically",
    );
    // Obstacle must be logically possible.
    expect(prompt.systemInstruction).toContain(
      "or a restriction that could only ever be lifted by doing the very thing it forbids",
    );
    // Drive must be motivation, not restated pressure.
    expect(prompt.systemInstruction).toContain(
      "not just restate the danger or pressure that belongs in Obstacle",
    );
    expect(prompt.systemInstruction).toContain(
      'A faction driven by Wealth or Ascension doesn\'t become "driven by Survival"',
    );
    // Earlier follow-up checks (spatial sense, provenance, item plausibility,
    // goal-item fit, conflict sharpness) folded into the same checklist.
    expect(prompt.systemInstruction).toContain(
      "do not borrow a race or culture from the wider setting just because it's genre-typical",
    );
    expect(prompt.systemInstruction).toContain(
      'Could this standoff be sharper than "both sides want the same treasure"',
    );
  });
});

describe("buildDungeonCoherencePrompt", () => {
  it("frames the pass as a repair, not a new generation, and embeds the prior output", () => {
    const prompt = buildDungeonPrompt({
      themeId: "fantasy",
      scale: "Small Lair (2 Sectors)",
    });
    const local = generateDungeonLocal(
      { themeId: "fantasy", scale: "Small Lair (2 Sectors)" },
      seededRng(1),
    );
    const parsed = parseDungeonResponseDetailed(
      JSON.stringify({
        title: local.title,
        summary: local.summary,
        throughline: "T",
        ...NARRATIVE,
        sectors: prompt.resolved.sectors.map((s, i) => ({
          name: `Room ${i + 1}`,
          description: "d",
          stockType: s.stockType,
          stockDetail: `detail ${i + 1}`,
        })),
        factions: [
          {
            ...FACTION_FIELDS,
            name: "the First",
            virtue: "Bold",
            vice: "Cruel",
            goal: "Wealth",
          },
          {
            ...FACTION_FIELDS,
            name: "the Second",
            virtue: "Wise",
            vice: "Greedy",
            goal: "Survival",
          },
        ],
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(parsed.rejected).toBe(false);
    expect(parsed.structured).toBeDefined();

    const coherence = buildDungeonCoherencePrompt(
      parsed.structured!,
      prompt.resolved,
    );
    expect(coherence.systemInstruction).toContain("NOT a new generation");
    expect(coherence.systemInstruction).toContain("placeholder faction name");
    expect(coherence.systemInstruction).toContain(
      "Never invent new major geography",
    );
    expect(coherence.userMessage).toContain("Previous output to repair");
    expect(coherence.userMessage).toContain(parsed.structured!.title);
    for (const sector of prompt.resolved.sectors) {
      expect(coherence.systemInstruction).toContain(sector.id);
    }
    expect(coherence.userMessage).toContain("Required JSON schema");
  });

  it("asks the repair pass to check entity ownership/dependency and Drive-explains-Goal", () => {
    const prompt = buildDungeonPrompt({
      themeId: "fantasy",
      scale: "Small Lair (2 Sectors)",
    });
    const parsed = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "T",
        summary: "S",
        throughline: "T",
        ...NARRATIVE,
        sectors: prompt.resolved.sectors.map((s, i) => ({
          name: `Room ${i + 1}`,
          description: "d",
          stockType: s.stockType,
          stockDetail: `detail ${i + 1}`,
        })),
        factions: [
          {
            ...FACTION_FIELDS,
            name: "the First",
            virtue: "Bold",
            vice: "Cruel",
            goal: "Wealth",
          },
          {
            ...FACTION_FIELDS,
            name: "the Second",
            virtue: "Wise",
            vice: "Greedy",
            goal: "Survival",
          },
        ],
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(parsed.structured).toBeDefined();

    const coherence = buildDungeonCoherencePrompt(
      parsed.structured!,
      prompt.resolved,
    );
    // Leads with a general contradiction-detection instruction, not just a checklist.
    expect(coherence.systemInstruction).toContain(
      "If any two claims can't both be true at once, that's a contradiction",
    );
    expect(coherence.systemInstruction).toContain(
      "not an exhaustive checklist",
    );
    // Item location must match the sector that actually names it.
    expect(coherence.systemInstruction).toContain(
      "is that the same sector whose own Lore/stockDetail/Monster entry actually establishes it?",
    );
    // Already-controls-it check.
    expect(coherence.systemInstruction).toContain(
      "given this faction's Territory, and everything the sector(s) in it already establish",
    );
    expect(coherence.systemInstruction).toContain(
      "Does Goal name something outside that already-controlled list?",
    );
    // factionSituation must match the faction's own Goal.
    expect(coherence.systemInstruction).toContain(
      "Does factionSituation actually describe this faction's own Goal",
    );
    // Relationship must involve the rival and not contradict Obstacle.
    expect(coherence.systemInstruction).toContain(
      "Does Relationship describe a strategy or attitude toward the rival faction specifically",
    );
    expect(coherence.systemInstruction).toContain(
      "bound by an oath from entering a sector, then actively sweeping into that same sector",
    );
    // Obstacle must be logically possible.
    expect(coherence.systemInstruction).toContain(
      "or a restriction that could only ever be lifted by doing the very thing it forbids",
    );
    // Drive must be motivation, not restated pressure.
    expect(coherence.systemInstruction).toContain(
      "not just restate the danger or pressure that belongs in Obstacle",
    );
    // Strength vs Territory/Obstacle.
    expect(coherence.systemInstruction).toContain(
      "take the edge off this faction's Obstacle without cancelling it outright",
    );
    // Cultural provenance check.
    expect(coherence.systemInstruction).toContain(
      "trace to something the history actually names",
    );
    // No inventing new capabilities for an already-established item.
    expect(coherence.systemInstruction).toContain(
      "does every later mention of an item stick to that same description, with no new power added on top?",
    );
    // Drive must fit Identity as well as Goal.
    expect(coherence.systemInstruction).toContain(
      "Does Drive explain why this faction wants its Goal, and fit its Identity too",
    );
    // Non-contiguous territory needs an established route or explanation.
    expect(coherence.systemInstruction).toContain(
      "If this faction's own Territory spans two non-adjacent sectors, is there an established shortcut connecting them, or does the text explain how it holds both despite the gap?",
    );
    // Sector ids still enforced.
    for (const sector of prompt.resolved.sectors) {
      expect(coherence.systemInstruction).toContain(sector.id);
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
      factionSituation:
        "Net-scrapper squatters are battling corporate turrets.",
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
    expect(out.content).toContain("## Faction Situation");
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
          identity: "A crew of surface scrappers turned corporate looters.",
          virtue: "Resourceful",
          vice: "Greedy",
          goal: "Strip the mainframe of every credit chip before security reboots.",
          drive: "Wealth",
          obstacle: "corporate turrets guarding the only route to the vault.",
          origin:
            "Former Aegis contractors laid off after the black-budget program was buried.",
          belief:
            "They believe Aegis owes them for the work it erased along with them.",
          territorySectorIds: ["sector-1"],
          leader: {
            name: "Reyes Vael",
            description: "a scrapper-queen who trusts no corp promise",
          },
          strength: "Two dozen squatters and a jury-rigged turret network.",
          notable: {
            name: "Priya Okonkwo",
            description: "the crew's only fluent Aegis systems hacker",
          },
          relationship:
            "They need the Corporate Erasure Squad to breach the mainframe core first, since only its access codes still work.",
        },
        {
          name: "the Corporate Erasure Squad",
          identity: "A corporate strike team sent to erase evidence.",
          virtue: "Disciplined",
          vice: "Cruel",
          goal: "Wipe every trace of the black-budget program from the mainframe core.",
          drive: "Destruction",
          obstacle:
            "a rogue AI core that has locked them out of the deepest vaults.",
          origin:
            "A strike team sent by Aegis Dynamics to erase the evidence at any cost.",
          belief:
            "They believe leaving any trace of the program intact risks corporate liability.",
          territorySectorIds: ["sector-1"],
          leader: {
            name: "Director Hask",
            description: "sent to erase the evidence at any cost",
          },
          strength: "A six-person strike team with full corporate backing.",
          notable: {
            name: "Corporal Reyes",
            description:
              "the squad's demolitions specialist, quietly rattled by what she's seen down here",
          },
          relationship:
            "They oppose the Net-Scrapper Squatters' looting, fearing a leak that would expose the program before it can be erased.",
        },
      ],
      factionSituation:
        "The Net-Scrapper Squatters are battling the Corporate Erasure Squad for the mainframe.",
      sectors: [
        {
          name: "Decontamination Lock",
          description: "Pressurized entry hall.",
          stockType: "Trap",
          stockDetail: "Laser grid tripwires.",
        },
      ],
      secret: "The AI possesses the master overrides to the planetary grid.",
      hazards: "High-voltage electrical arcs and laser grid traps.",
      treasures: "Encrypted memory crystal with 50,000 corporate credits.",
      hooks: "A fix-it netrunner hires the crew to recover the memory crystal.",
    });

    const out = parseDungeonResponse(sampleJson, { themeId: "cyberpunk" });
    expect(out.content).toContain("### the Net-Scrapper Squatters");
    expect(out.content).toContain("### the Corporate Erasure Squad");
    expect(out.content).toContain(
      "**Leader:** Reyes Vael — a scrapper-queen who trusts no corp promise.",
    );
    expect(out.content).toContain(
      "**Strength:** A six-person strike team with full corporate backing.",
    );
    expect(out.content).toContain(
      "**Notable:** Corporal Reyes — the squad's demolitions specialist, quietly rattled by what she's seen down here.",
    );
    expect(out.content).toContain(
      "**Relationship:** They oppose the Net-Scrapper Squatters' looting, fearing a leak that would expose the program before it can be erased.",
    );
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
      "**Obstacle:** A rival faction sharing these halls.",
    );
    expect(out.content).toContain("**Obstacle:** An ancient guardian.");
    expect(out.content).not.toMatch(/held back by/i);
    expect(out.content).not.toMatch(/struggling against/i);
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

  it("rejects a schema-echoed placeholder faction name and ships the foundation", () => {
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

    for (const badName of ["Faction A", "First Faction", "Unnamed Faction"]) {
      const result = parseDungeonResponseDetailed(
        JSON.stringify({
          title: "Model Title",
          summary: "S",
          sectors,
          factions: [
            {
              name: badName,
              virtue: "Bold",
              vice: "Cruel",
              goal: "Wealth",
              obstacle: "o1",
            },
            {
              name: "the Ashwrights",
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
      expect(result.rejected, badName).toBe(true);
      expect(result.problems.join(" "), badName).toContain(
        "placeholder faction name",
      );
      expect(result.output.title).toBe(prompt.resolved.title);
    }

    // A genuinely invented name is fine.
    const clean = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "Model Title",
        summary: "S",
        throughline: "T",
        sectors,
        factions: [
          {
            name: "the Ashwrights",
            virtue: "Bold",
            vice: "Cruel",
            goal: "Wealth",
            obstacle: "o1",
          },
          {
            name: "the Gale Wardens",
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
    expect(clean.rejected).toBe(false);
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
          ...FACTION_FIELDS,
          drive: "Dominion",
          name: "the First",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "o1",
        },
        {
          ...FACTION_FIELDS,
          drive: "Escape",
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

  it("asks for different traits after a pair is used, without rejecting", () => {
    // The model pairs archetypes with traits consistently: knowledge-seekers
    // kept returning as "Curiosity, but Hubris" across genres under different
    // names. Reported so the retry asks — but never rejected, since losing a
    // whole dungeon over a repeated adjective is the disproportion #1864 fixed.
    const avoidTraits = ["Curiosity, but Hubris"];
    const prompt = buildDungeonPrompt({
      themeId: "sci-fi",
      scale: "Medium Complex (3-4 Sectors)",
      avoidTraits,
    });
    expect(prompt.userMessage).toContain("Virtue/vice pairs already used");
    expect(prompt.userMessage).toContain("Curiosity, but Hubris");

    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const body = {
      title: "The Invented Vault",
      summary: "S",
      throughline: "T",
      ...NARRATIVE,
      sectors,
    };

    const reused = parseDungeonResponseDetailed(
      JSON.stringify({
        ...body,
        factions: [
          {
            name: "the First",
            virtue: "Curiosity",
            vice: "Hubris",
            goal: "Knowledge",
            obstacle: "o1",
          },
          {
            name: "the Second",
            virtue: "Resolve",
            vice: "Greed",
            goal: "Wealth",
            obstacle: "o2",
          },
        ],
      }),
      { avoidTraits },
      seededRng(1),
      prompt.resolved,
    );
    expect(reused.problems.join(" ")).toContain("virtue/vice pairs");
    // Reported, but the model's work is kept.
    expect(reused.rejected).toBe(false);
    expect(reused.output.title).toBe("The Invented Vault");

    // A fresh pair is clean.
    const fresh = parseDungeonResponseDetailed(
      JSON.stringify({
        ...body,
        factions: [
          {
            ...FACTION_FIELDS,
            drive: "Dominion",
            name: "the First",
            virtue: "Patience",
            vice: "Spite",
            goal: "Knowledge",
            obstacle: "o1",
          },
          {
            ...FACTION_FIELDS,
            drive: "Escape",
            name: "the Second",
            virtue: "Resolve",
            vice: "Greed",
            goal: "Wealth",
            obstacle: "o2",
          },
        ],
      }),
      { avoidTraits },
      seededRng(1),
      prompt.resolved,
    );
    expect(fresh.problems).toEqual([]);
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
        ...FACTION_FIELDS,
        drive: "Dominion",
        name: "The Obsidian Directorate",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        ...FACTION_FIELDS,
        drive: "Escape",
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

  it("renders hooks, hazards and treasures as lists in both paths", () => {
    // These are discrete entries a GM picks between, not prose. Joining them
    // welded three distinct hooks into one run-on paragraph.
    const local = generateDungeonLocal(
      { themeId: "sci-fi", scale: "Medium Complex (3-4 Sectors)" },
      seededRng(5),
    );
    for (const heading of [
      "### Hazards & Traps",
      "### Treasures & Artifacts",
      "### Adventure Hooks & Rumours",
    ]) {
      const section = local.lore.split(heading)[1].split("###")[0];
      const bullets = (section.match(/^- /gm) ?? []).length;
      expect(bullets, `${heading} should be a list`).toBeGreaterThanOrEqual(2);
    }

    // The offline path used to offer exactly one of each.
    const resolved = buildDungeonPrompt({ themeId: "sci-fi" }).resolved;
    expect(resolved.hooks.length).toBeGreaterThanOrEqual(2);
    expect(resolved.hazards.length).toBeGreaterThanOrEqual(2);
    expect(resolved.treasures.length).toBeGreaterThanOrEqual(2);
    // The central secret stays singular — a delve has one.
    expect(typeof resolved.secret).toBe("string");
  });

  it("declares the list sections as arrays in the schema", () => {
    // The old schema asked hooks for "2-3 reasons" while typing it a string.
    // A model resolving that toward the count produced an array we read as
    // missing, and silently replaced with table prose.
    const prompt = buildDungeonPrompt({ themeId: "sci-fi" });
    expect(prompt.userMessage).toContain('"hooks": [');
    expect(prompt.userMessage).toContain('"hazards": [');
    expect(prompt.userMessage).toContain('"treasures": [');
  });

  it("accepts a narrative field returned as a list rather than a string", () => {
    // "2-3 reasons a party would come here" invites a JSON array. Requiring a
    // string made an arrayed answer look like an omission, so it was quietly
    // replaced with table prose while the rest of the delve stayed original.
    const prompt = buildDungeonPrompt({
      themeId: "sci-fi",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const sectors = prompt.resolved.sectors.map((s, i) => ({
      name: `Room ${i + 1}`,
      description: "d",
      stockType: s.stockType,
      stockDetail: `detail ${i + 1}`,
    }));
    const { hooks: _s, ...rest } = NARRATIVE;

    const result = parseDungeonResponseDetailed(
      JSON.stringify({
        title: "T",
        summary: "S",
        throughline: "T",
        ...rest,
        hooks: [
          "A distress beacon resumed after forty years.",
          "A rival crew went in and has not reported since.",
        ],
        sectors,
        factions: [
          {
            ...FACTION_FIELDS,
            drive: "Dominion",
            name: "the First",
            virtue: "Bold",
            vice: "Cruel",
            goal: "Wealth",
            obstacle: "o1",
          },
          {
            ...FACTION_FIELDS,
            drive: "Escape",
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

    expect(result.problems).toEqual([]);
    expect(result.output.lore).toContain("A distress beacon resumed");
    expect(result.output.lore).toContain("has not reported since");
    // The table hook must not have been substituted.
    for (const h of prompt.resolved.hooks) {
      expect(result.output.lore).not.toContain(h);
    }
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
        ...FACTION_FIELDS,
        drive: "Dominion",
        name: "the First",
        virtue: "Bold",
        vice: "Cruel",
        goal: "Wealth",
        obstacle: "o1",
      },
      {
        ...FACTION_FIELDS,
        drive: "Escape",
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
      factionSituation: "Model conflict.",
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
      "## Key Sectors & Layout",
      "## Faction Situation",
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
    expect(out.lore).toContain(prompt.resolved.hooks[0]);
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
    // Both factions' drives are fixed by the roll, not chosen by the model.
    for (const faction of prompt.resolved.factions) {
      expect(prompt.userMessage).toContain(faction.drive);
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

  it("capitalizes the standalone Obstacle field regardless of the AI's casing", () => {
    const sampleJson = JSON.stringify({
      title: "T",
      summary: "S",
      throughline: "T",
      ...NARRATIVE,
      sectors: [],
      factions: [
        {
          name: "A",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "Deep-seated paranoia among their captains.",
        },
        {
          name: "B",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Survival",
          obstacle: "An unbreakable blood-oath.",
        },
      ],
    });

    const out = parseDungeonResponse(sampleJson, {});
    expect(out.content).toContain(
      "**Obstacle:** Deep-seated paranoia among their captains.",
    );
    expect(out.content).toContain("**Obstacle:** An unbreakable blood-oath.");
  });

  it("keeps a proper noun at the start of an obstacle capitalised", () => {
    const sampleJson = JSON.stringify({
      title: "T",
      summary: "S",
      throughline: "T",
      ...NARRATIVE,
      sectors: [],
      factions: [
        {
          name: "A",
          virtue: "Bold",
          vice: "Cruel",
          goal: "Wealth",
          obstacle: "Union Command already has the site flagged",
        },
        {
          name: "B",
          virtue: "Wise",
          vice: "Greedy",
          goal: "Survival",
          obstacle: "NHP lockouts they cannot clear",
        },
      ],
    });

    const out = parseDungeonResponse(sampleJson, {});
    expect(out.content).toContain(
      "**Obstacle:** Union Command already has the site flagged.",
    );
    expect(out.content).toContain(
      "**Obstacle:** NHP lockouts they cannot clear.",
    );
  });

  it("closes a stock detail the model left unterminated", () => {
    const prompt = buildDungeonPrompt({
      themeId: "fantasy",
      scale: "Medium Complex (3-4 Sectors)",
    });
    const out = parseDungeonResponse(
      JSON.stringify({
        title: "T",
        summary: "S",
        throughline: "T",
        ...NARRATIVE,
        sectors: prompt.resolved.sectors.map((s, i) => ({
          name: `Room ${i + 1}`,
          description: "d",
          stockType: s.stockType,
          stockDetail: `a ballista manned by mercenaries ${i + 1}`,
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
      }),
      {},
      seededRng(1),
      prompt.resolved,
    );
    expect(out.content).toContain("mercenaries 1.*");
    expect(out.content).not.toMatch(/mercenaries \d\*/);
  });

  it("strips a redundant 'Seeks'/'to' lead-in an AI adds to a goal", () => {
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
          goal: "to reach Ascension.",
          obstacle: "an ancient guardian",
        },
      ],
      sectors: [],
    });

    const out = parseDungeonResponse(sampleJson, {});
    expect(out.content).toContain("**Goal:** Survival.");
    expect(out.content).toContain("**Goal:** Reach Ascension.");
    expect(out.content).not.toMatch(/seeks/i);
    // Only the Goal field itself must be clean of the lead-in — composed
    // prose elsewhere (e.g. Relationship) may legitimately say "plan to
    // reach X" once, which is not the doubled "to to reach" this guards against.
    expect(out.content).not.toMatch(/\*\*Goal:\*\* to reach/i);
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

describe("collectSessionTraits", () => {
  it("extracts virtue/vice pairs from rendered faction sections", () => {
    const pairs = collectSessionTraits([
      {
        content: "### the Choir\n\nDevotion, but Fanaticism.\n\n**Goal:** x.",
      },
      {
        content: "### the Cell\n\nCuriosity, but Hubris.\n\n**Goal:** y.",
      },
    ]);
    expect(pairs).toContain("Devotion, but Fanaticism");
    expect(pairs).toContain("Curiosity, but Hubris");
  });

  it("caps the list and ignores entities with no factions", () => {
    expect(collectSessionTraits([{}, { content: "no factions here" }])).toEqual(
      [],
    );
    const many = Array.from({ length: 40 }, (_, i) => ({
      content: `### f${i}\n\nV${i}, but W${i}.\n\n**Goal:** g.`,
    }));
    expect(collectSessionTraits(many).length).toBeLessThanOrEqual(12);
  });
});

describe("collectSessionNames", () => {
  it("gathers titles and faction names, newest first, article stripped", () => {
    const names = collectSessionNames([
      { title: "First Delve", content: "### the Iron Pact\n\na, but b." },
      { title: "Second Delve", content: "### The Ashen Choir\n\na, but b." },
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

describe("dungeon campaign context", () => {
  it("carries the form's world context into the prompt", () => {
    const prompt = buildDungeonPrompt({
      genre: "Fantasy",
      campaignContext: "The Swift Wing Eagles rule the Kestrel Reach.",
    });
    expect(prompt.userMessage).toContain(
      "- Campaign Context: The Swift Wing Eagles rule the Kestrel Reach.",
    );
  });

  it("omits the line when no context was given", () => {
    expect(buildDungeonPrompt({ genre: "Fantasy" }).userMessage).not.toContain(
      "- Campaign Context:",
    );
  });
});
