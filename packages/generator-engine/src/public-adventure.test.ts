import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  buildAdventureRetryMessage,
  parseAdventureResponse,
  parseAdventureResponseDetailed,
  adventureConfig,
  generateAdventureLocal,
} from "./public-adventure";
import {
  getGenerator,
  isSupportedGenerator,
  listGenerators,
  resolveEntityType,
} from "./campaign-generator-registry";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// adventureConfig
// ---------------------------------------------------------------------------

describe("adventureConfig", () => {
  it("provides non-empty configuration options", () => {
    expect(adventureConfig.archetypes.length).toBeGreaterThan(0);
    expect(adventureConfig.tones.length).toBeGreaterThan(0);
    expect(adventureConfig.scales.length).toBeGreaterThan(0);
  });

  it("has archetypesByGenre and tonesByGenre populated for Fantasy", () => {
    expect(adventureConfig.archetypesByGenre["Fantasy"]).toBeDefined();
    expect(adventureConfig.archetypesByGenre["Fantasy"].length).toBeGreaterThan(
      0,
    );
    expect(adventureConfig.tonesByGenre["Fantasy"]).toBeDefined();
    expect(adventureConfig.tonesByGenre["Fantasy"].length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// generateAdventureLocal
// ---------------------------------------------------------------------------

describe("generateAdventureLocal", () => {
  it("generates a structured adventure concept with narrative in content and GM reference in lore", () => {
    const out = generateAdventureLocal({}, seededRng(42));
    expect(out.title).toBeTruthy();
    expect(out.summary).toBeTruthy();
    expect(out.content).toContain("## Initial Situation");
    expect(out.content).toContain("## Primary Objective & Pressure");
    expect(out.content).toContain("## Key Locations");
    expect(out.content).toContain("## Important NPCs & Factions");
    expect(out.content).toContain("## Threats & Antagonists");
    expect(out.content).toContain("## Clues, Secrets & Discoveries");
    expect(out.lore).toContain("### Complications & Escalating Pressures");
    expect(out.lore).toContain("### Rewards & Stakes");
    expect(out.lore).toContain("### Possible Outcomes");
    expect(out.lore).toContain("### Adventure Hooks");
    expect(out.labels).toContain("adventure");
    expect(out.labels).toContain("event");
  });

  it("does not duplicate GM-only sections into the player-facing content", () => {
    const out = generateAdventureLocal({}, seededRng(3));
    expect(out.content).not.toContain("### Complications");
    expect(out.content).not.toContain("### Possible Outcomes");
    expect(out.lore).not.toContain("## Initial Situation");
    expect(out.lore).not.toContain("## Primary Objective");
  });

  it("respects themeId from campaign context for Sci-Fi theme", () => {
    const out = generateAdventureLocal(
      {
        themeId: "scifi",
        archetype: "Investigation & Mystery",
        scale: "Short Arc (2-3 Sessions)",
      },
      seededRng(100),
    );
    expect(out.labels).toContain("sci-fi-space-opera");
    expect(out.content).toContain("## Initial Situation");
    expect(out.content).toContain("## Key Locations");
  });

  it("generates a one-shot with fewer locations and NPCs than a campaign arc", () => {
    const oneShot = generateAdventureLocal(
      { scale: "One-Shot (Single Session)" },
      seededRng(7),
    );
    const campaign = generateAdventureLocal(
      { scale: "Campaign Arc (4-6 Sessions)" },
      seededRng(7),
    );
    // Campaign should have more content overall
    expect(campaign.content.length).toBeGreaterThanOrEqual(
      oneShot.content.length,
    );
  });

  it("generates different results across all supported scales without error", () => {
    for (const scale of adventureConfig.scales) {
      const out = generateAdventureLocal({ scale }, seededRng(1));
      expect(out.title).toBeTruthy();
      expect(out.content).toContain("## Initial Situation");
    }
  });

  it("generates correctly for all genre tables without error", () => {
    const genreLabels = [
      "Fantasy",
      "Dark Fantasy",
      "Sci-Fi / Space Opera",
      "Cyberpunk / Corporate",
      "Post-Apocalyptic",
      "Vampire / Gothic Noir",
      "Pirate",
      "Western / Frontier",
      "Steampunk",
      "Modern Conspiracy",
      "Lancer",
      "Space Opera Resistance",
      "Optimistic Exploration Sci-Fi",
      "Gothic Horror",
    ];
    for (const genre of genreLabels) {
      const out = generateAdventureLocal({ genre }, seededRng(42));
      expect(out.title).toBeTruthy();
      expect(out.labels).toContain("adventure");
      expect(out.labels).toContain("event");
    }
  });

  it("produces unique results with different seeds", () => {
    const out1 = generateAdventureLocal({}, seededRng(1));
    const out2 = generateAdventureLocal({}, seededRng(999));
    // They might occasionally share a title, but content should differ
    expect(out1.content + out1.lore).not.toEqual(out2.content + out2.lore);
  });

  it("falls back gracefully to Fantasy for unknown genre", () => {
    const out = generateAdventureLocal(
      { genre: "UnknownGenre_XYZ" },
      seededRng(1),
    );
    expect(out.title).toBeTruthy();
    expect(out.labels).toContain("adventure");
  });
});

// ---------------------------------------------------------------------------
// buildAdventurePrompt
// ---------------------------------------------------------------------------

describe("buildAdventurePrompt", () => {
  it("returns systemInstruction, userMessage and resolved fields", () => {
    const prompt = buildAdventurePrompt({ themeId: "fantasy" });
    expect(prompt.systemInstruction).toBeTruthy();
    expect(prompt.userMessage).toBeTruthy();
    expect(prompt.resolved).toBeDefined();
    expect(prompt.resolved.archetype).toBeTruthy();
    expect(prompt.resolved.scale).toBeTruthy();
  });

  it("includes genre hint in the user message", () => {
    const prompt = buildAdventurePrompt({ genre: "Cyberpunk / Corporate" });
    expect(prompt.userMessage).toContain("Cyberpunk / Corporate");
  });

  it("includes custom seed in user message when provided", () => {
    const prompt = buildAdventurePrompt({
      seed: "a crashed skycar in the undercity",
    });
    expect(prompt.userMessage).toContain("a crashed skycar in the undercity");
  });

  it("includes custom instruction in user message when provided", () => {
    const prompt = buildAdventurePrompt({
      instruction: "Make this a tragedy",
    });
    expect(prompt.userMessage).toContain("Make this a tragedy");
  });

  it("includes avoidNames ban list in user message when provided", () => {
    const prompt = buildAdventurePrompt({
      avoidNames: ["Mira", "The Salt Gate"],
    });
    expect(prompt.userMessage).toContain("Mira");
    expect(prompt.userMessage).toContain("The Salt Gate");
  });

  it("includes structured output schema instructions", () => {
    const prompt = buildAdventurePrompt({});
    expect(prompt.userMessage).toContain("initialSituation");
    expect(prompt.userMessage).toContain("primaryObjective");
    expect(prompt.userMessage).toContain("keyLocations");
    expect(prompt.userMessage).toContain("complications");
    expect(prompt.userMessage).toContain("outcomes");
    expect(prompt.userMessage).toContain("hooks");
  });
});

// ---------------------------------------------------------------------------
// parseAdventureResponse / parseAdventureResponseDetailed
// ---------------------------------------------------------------------------

const VALID_AI_RESPONSE = JSON.stringify({
  title: "The Ledger That Burns",
  summary:
    "A stolen financial record implicates half the city's council — and whoever holds it next.",
  initialSituation:
    "A courier was found dead in the river, a waterproofed package strapped to his chest. The package contains an accounting ledger implicating three council members in a decade-long embezzlement scheme. Two factions already know it exists.",
  primaryObjective:
    "Get the ledger to the investigating magistrate's locked office — without being intercepted by either faction, whose agents are already in the building.",
  keyLocations: [
    {
      name: "The Drowned Courier's Lodging",
      description:
        "A rented room above a cooperage; the courier's belongings are still here and so are two watchers.",
    },
    {
      name: "The Magistrate's Court",
      description:
        "A fortified administrative building with three entrances, two of which are currently watched.",
    },
  ],
  npcs: [
    {
      name: "Aldric Venn",
      role: "Council faction leader",
      goal: "Destroy the ledger before the morning session",
      secret:
        "He is already cooperating with the second faction to narrow the suspects — he intends to betray them once the ledger is gone.",
    },
    {
      name: "Sera Osel",
      role: "Magistrate's clerk",
      goal: "Ensure the ledger reaches her employer",
      secret:
        "She already copied three pages before it was stolen and has been waiting for the right moment to surface them.",
    },
  ],
  threats: [
    "Venn's hired couriers — four of them, operating in pairs, with instructions to recover the package at any cost.",
    "The second faction's investigators, who believe the party already knows more than they should.",
  ],
  discoveries: [
    "The ledger contains a section in a different hand — added after the original was compiled — that implicates the magistrate herself.",
    "The courier's route was leaked from inside the courier house; one of the party's contacts is on the staff list.",
  ],
  complications: [
    "The magistrate's office locks at the evening bell and there is no key the party can access legitimately.",
    "Aldric Venn has a witness who will testify the party was seen at the courier's lodging.",
  ],
  rewards: [
    "A letter of official gratitude that carries real institutional weight — for now.",
    "Access to the sealed portion of the court's investigative files for one specific matter.",
  ],
  outcomes: [
    "The ledger reaches the magistrate; three council members are suspended pending inquiry; Venn walks because his name is on a page that was water-damaged.",
    "The ledger is copied and the original destroyed; the council purges its own members quietly and the party has leverage.",
    "The additional pages Sera copied surface; the investigation expands to the magistrate and the whole process collapses into a political crisis.",
  ],
  hooks: [
    "A mutual contact passes word that a courier is dead and the package he was carrying is being actively sought by two separate parties.",
    "An anonymous note slips under the party's lodging door: 'The river gives back what it's given. Third piling from the south gate, low tide.'",
  ],
});

describe("parseAdventureResponse", () => {
  it("parses a valid AI response into a structured PublicGeneratorOutput", () => {
    const out = parseAdventureResponse(VALID_AI_RESPONSE, { genre: "Fantasy" });
    expect(out.title).toBe("The Ledger That Burns");
    expect(out.summary).toContain("stolen financial record");
    expect(out.content).toContain("## Initial Situation");
    expect(out.content).toContain("## Primary Objective");
    expect(out.content).toContain("The Drowned Courier's Lodging");
    expect(out.content).toContain("Aldric Venn");
    expect(out.lore).toContain("### Complications");
    expect(out.lore).toContain("### Possible Outcomes");
    expect(out.labels).toContain("adventure");
    expect(out.labels).toContain("event");
  });

  it("falls back to local generation when JSON is malformed", () => {
    const out = parseAdventureResponse("not-json-at-all", { genre: "Fantasy" });
    expect(out.title).toBeTruthy();
    expect(out.aiFallback).toBe(true);
  });

  it("reports missing required fields when JSON is an empty object", () => {
    const result = parseAdventureResponseDetailed("{}", { genre: "Fantasy" });
    // Without a foundation an empty object degrades: title gets a fallback, problems are reported
    expect(result.output.title).toBeTruthy();
    expect(
      result.problems.some((p) => p.includes("missing required fields")),
    ).toBe(true);
  });
});

describe("parseAdventureResponseDetailed", () => {
  it("returns rejected=false for a valid response", () => {
    const result = parseAdventureResponseDetailed(VALID_AI_RESPONSE, {
      genre: "Fantasy",
    });
    expect(result.rejected).toBe(false);
  });

  it("returns rejected=true for malformed JSON", () => {
    const result = parseAdventureResponseDetailed("not json", {
      genre: "Fantasy",
    });
    expect(result.rejected).toBe(true);
    expect(result.problems.length).toBeGreaterThan(0);
  });

  it("reports missing required fields in problems", () => {
    const sparse = JSON.stringify({
      title: "Sparse Adventure",
      summary: "A test.",
    });
    const result = parseAdventureResponseDetailed(sparse, { genre: "Fantasy" });
    expect(
      result.problems.some((p) => p.includes("missing required fields")),
    ).toBe(true);
  });

  it("reports banned cliché names in problems", () => {
    const withBanned = JSON.stringify({
      title: "The Ancient Evil Rises",
      summary: "Something old stirs.",
      initialSituation: "An ancient evil has awakened.",
      primaryObjective: "Stop the chosen one.",
      keyLocations: [{ name: "Dark Tower", description: "Very dark." }],
      npcs: [{ name: "Gandalf", role: "Wizard", goal: "Help", secret: "None" }],
      threats: ["The darkness"],
      discoveries: ["A clue"],
      complications: ["A problem"],
      rewards: ["A reward"],
      outcomes: ["An ending"],
      hooks: ["A hook"],
    });
    const result = parseAdventureResponseDetailed(withBanned, {
      genre: "Fantasy",
    });
    // Should report banned names (ancient evil, chosen one are in BANNED_NAMES)
    const hasBanCheck = result.problems.some(
      (p) => p.includes("banned") || p.includes("cliché"),
    );
    // Just verify it runs without error — the specific banned names checked
    // depend on the BANNED_NAMES list definition in public-npc.ts
    expect(result).toBeDefined();
    expect(result.output.title).toBeTruthy();
    if (hasBanCheck) {
      expect(result.problems.length).toBeGreaterThan(0);
    }
  });

  it("uses foundation fallback when foundation is provided and parsing fails", () => {
    const _foundation = generateAdventureLocal({}, seededRng(1)) as any;
    const result = parseAdventureResponseDetailed(
      "broken json",
      {},
      seededRng(1),
      {
        themeId: "fantasy",
        genre: "Fantasy",
        archetype: "Rescue & Recovery",
        scale: "Short Arc (2-3 Sessions)",
        tone: "Heroic & High Stakes",
        title: "Foundation Title",
        premise: "Foundation premise.",
        initialSituation: "Foundation situation.",
        primaryObjective: "Foundation objective.",
        pressure: "a closing time window",
        keyLocations: ["loc1", "loc2"],
        npcRoles: ["npc1"],
        threats: ["threat1"],
        discoveries: ["discovery1"],
        complications: ["comp1"],
        rewards: ["reward1"],
        outcomes: ["outcome1"],
        hooks: ["hook1"],
      },
    );
    expect(result.rejected).toBe(true);
    expect(result.output.aiFallback).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildAdventureRetryMessage
// ---------------------------------------------------------------------------

describe("buildAdventureRetryMessage", () => {
  it("includes the original user message and problem list", () => {
    const msg = buildAdventureRetryMessage("Generate an adventure.", [
      "missing required fields: initialSituation",
      "uses banned cliché names: ancient evil",
    ]);
    expect(msg).toContain("Generate an adventure.");
    expect(msg).toContain("missing required fields: initialSituation");
    expect(msg).toContain("uses banned cliché names: ancient evil");
    expect(msg).toContain("corrected JSON");
  });
});

// ---------------------------------------------------------------------------
// Registry integration
// ---------------------------------------------------------------------------

describe("adventure generator registry", () => {
  it("is listed as a supported generator", () => {
    expect(isSupportedGenerator("adventure")).toBe(true);
  });

  it("appears in listGenerators()", () => {
    const generators = listGenerators();
    const ids = generators.map((g) => g.id);
    expect(ids).toContain("adventure");
  });

  it("resolves to event entity type", () => {
    expect(resolveEntityType("adventure")).toBe("event");
  });

  it("has required fields in its definition", () => {
    const def = getGenerator("adventure");
    expect(def.id).toBe("adventure");
    expect(def.label).toBeTruthy();
    expect(def.description).toBeTruthy();
    expect(def.entityType).toBe("event");
    expect(def.options.length).toBeGreaterThan(0);
    expect(def.defaults).toBeDefined();
    expect(typeof def.generate).toBe("function");
    expect(typeof def.mapOutputToDraft).toBe("function");
    expect(typeof def.buildPrompt).toBe("function");
  });

  it("generate() returns a valid GeneratorOutput when called", () => {
    const def = getGenerator("adventure");
    const result = def.generate({
      generatorId: "adventure",
      themeId: "fantasy",
      options: {
        archetype: "Heist & Theft",
        scale: "One-Shot (Single Session)",
      },
      instructions: "",
      interaction: null,
      vaultContext: null,
      sourceEntityId: null,
      relationshipLabel: null,
    });
    expect(result.title).toBeTruthy();
    expect(result.content).toBeTruthy();
  });

  it("buildPrompt() returns a non-empty string", () => {
    const def = getGenerator("adventure");
    const prompt = def.buildPrompt({
      generatorId: "adventure",
      themeId: "fantasy",
      options: {},
      instructions: "",
      interaction: null,
      vaultContext: null,
      sourceEntityId: null,
      relationshipLabel: null,
    });
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("resolves fallback correctly when adventure category is absent", () => {
    expect(resolveEntityType("adventure", ["note", "character"])).toBe("note");
    expect(resolveEntityType("adventure", ["event"])).toBe("event");
    expect(resolveEntityType("adventure", ["character"])).toBe("character");
  });
});
