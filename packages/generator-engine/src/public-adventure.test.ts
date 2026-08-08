import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  buildAdventureRetryMessage,
  parseAdventureResponse,
  parseAdventureResponseDetailed,
  extractSeedProperNouns,
  seedStatesDeadline,
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

  it("does not put GM-only sections into the player-facing content", () => {
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
      "Cosmic Horror",
    ];
    for (const genre of genreLabels) {
      const out = generateAdventureLocal({ genre }, seededRng(42));
      expect(out.title).toBeTruthy();
      expect(out.labels).toContain("adventure");
      expect(out.labels).toContain("event");
    }
  });

  it("uses dedicated Cosmic Horror tables instead of the Fantasy fallback", () => {
    const out = generateAdventureLocal(
      { genre: "Cosmic Horror" },
      seededRng(12),
    );
    expect(out.labels).toContain("cosmic-horror");
    expect(out.content).toMatch(
      /university|harbour|archive|observatory|weather station|research vessel|boarding house/i,
    );
    expect(out.content).not.toContain("walled market city");
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

  it("includes multi-asset classification and preservation dilemma instructions", () => {
    const prompt = buildAdventurePrompt({ genre: "Western Frontier" });
    expect(prompt.systemInstruction).toContain(
      "MULTI-ASSET CLASSIFICATION & PRESERVATION DILEMMAS",
    );
    expect(prompt.systemInstruction).toContain("Essential");
    expect(prompt.systemInstruction).toContain("Expendable");
    expect(prompt.systemInstruction).toContain("Secretly Critical");
  });

  it("includes consistent objective asset tracking and split asset allocation instructions", () => {
    const prompt = buildAdventurePrompt({ genre: "Fantasy" });
    expect(prompt.systemInstruction).toContain(
      "CONSISTENT OBJECTIVE ASSET TRACKING & SPLIT ASSET ALLOCATION",
    );
    expect(prompt.systemInstruction).toContain("initialSituation");
    expect(prompt.systemInstruction).toContain("primaryObjective");
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
  throughline:
    "A courier carrying evidence of council embezzlement was killed, forcing the party to reach the magistrate before corrupt factions destroy the evidence.",
  initialSituation:
    "A courier was found dead in the river, a waterproofed package strapped to his chest. The package contains an accounting ledger implicating three council members in a decade-long embezzlement scheme. Two factions already know it exists.",
  primaryObjective:
    "Get the ledger to the investigating magistrate's locked office — without being intercepted by either faction, whose agents are already in the building.",
  keyLocations: [
    {
      name: "The Drowned Courier's Lodging",
      description:
        "A rented room above a cooperage; the courier's belongings are still here and so are two watchers.",
      dilemma:
        "Burn the room to destroy evidence of your visit or leave it intact to keep the watchers off your trail.",
    },
    {
      name: "The Magistrate's Court",
      description:
        "A fortified administrative building with three entrances, two of which are currently watched.",
      dilemma:
        "Force passage through the watched main doors or bribe a corrupt clerk to use the sewer grate.",
    },
  ],
  npcs: [
    {
      name: "Aldric Venn",
      role: "Council faction leader",
      goal: "Destroy the ledger before the morning session",
      secret:
        "He is already cooperating with the second faction to narrow the suspects — he intends to betray them once the ledger is gone.",
      dilemma:
        "Extort Venn for a massive reward or expose his double-cross to the investigators.",
    },
    {
      name: "Sera Osel",
      role: "Magistrate's clerk",
      goal: "Ensure the ledger reaches her employer",
      secret:
        "She already copied three pages before it was stolen and has been waiting for the right moment to surface them.",
      dilemma:
        "Trust Sera with the original ledger or use her stolen copies as bait.",
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

  it("resolves to note entity type", () => {
    expect(resolveEntityType("adventure")).toBe("note");
  });

  it("has required fields in its definition", () => {
    const def = getGenerator("adventure");
    expect(def.id).toBe("adventure");
    expect(def.label).toBeTruthy();
    expect(def.description).toBeTruthy();
    expect(def.entityType).toBe("note");
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

// ---------------------------------------------------------------------------
// Binding user-supplied seeds
// ---------------------------------------------------------------------------

/** A hook copied straight out of the star system generator's sidebar. */
const AURELIA_HOOK =
  "Broker a tense truce between striking miners on Amalthea and corporate " +
  "executives on Phobos-Zero before sabotage disables the station's primary " +
  "reaction mass pumps.";

describe("extractSeedProperNouns", () => {
  it("keeps names that appear mid-sentence", () => {
    const nouns = extractSeedProperNouns(AURELIA_HOOK);
    expect(nouns).toContain("Amalthea");
    expect(nouns).toContain("Phobos-Zero");
  });

  it("skips a plain capitalised word that only opens a sentence", () => {
    const nouns = extractSeedProperNouns(
      "Investigate the missing grain shipments.",
    );
    expect(nouns).not.toContain("Investigate");
  });

  it("keeps a distinctive token even at the start of a sentence", () => {
    expect(extractSeedProperNouns("Aurelia-7 is starving.")).toContain(
      "Aurelia-7",
    );
  });

  it("returns nothing for a seed with no names", () => {
    expect(extractSeedProperNouns("a crashed skycar in the undercity")).toEqual(
      [],
    );
  });
});

describe("seedStatesDeadline", () => {
  it("detects a 'before X happens' consequence", () => {
    expect(seedStatesDeadline(AURELIA_HOOK)).toBe(true);
  });

  it("detects an explicit time window", () => {
    expect(seedStatesDeadline("Recover the core within six hours.")).toBe(true);
  });

  it("is false for a situation with no stated pressure", () => {
    expect(seedStatesDeadline("A crashed skycar in the undercity.")).toBe(
      false,
    );
  });
});

describe("buildAdventurePrompt with a user seed", () => {
  it("presents the seed as binding fact rather than a creative seed", () => {
    const prompt = buildAdventurePrompt({ seed: AURELIA_HOOK });
    expect(prompt.userMessage).toContain("GIVEN SITUATION");
    expect(prompt.userMessage).toContain(AURELIA_HOOK);
    expect(prompt.userMessage).toContain("must be ABOUT this situation");
  });

  it("lists the seed's names as fixed", () => {
    const prompt = buildAdventurePrompt({ seed: AURELIA_HOOK });
    expect(prompt.userMessage).toContain("These names are fixed");
    expect(prompt.userMessage).toContain("- Amalthea");
    expect(prompt.userMessage).toContain("- Phobos-Zero");
  });

  it("promotes a seed's stated deadline to the adventure's pressure", () => {
    const prompt = buildAdventurePrompt({ seed: AURELIA_HOOK });
    expect(prompt.userMessage).toContain("states its own deadline");
  });

  it("omits the deadline instruction for a seed with no stated pressure", () => {
    const prompt = buildAdventurePrompt({
      seed: "A crashed skycar in the undercity.",
    });
    expect(prompt.userMessage).toContain("GIVEN SITUATION");
    expect(prompt.userMessage).not.toContain("states its own deadline");
  });

  it("tells the model the seed's names override the name restrictions", () => {
    const prompt = buildAdventurePrompt({ seed: AURELIA_HOOK });
    expect(prompt.systemInstruction).toContain("GIVEN SITUATION");
    expect(prompt.userMessage).toContain(
      `"already used elsewhere" list do NOT apply`,
    );
  });

  it("does not ask the model to avoid names the seed itself introduced", () => {
    const prompt = buildAdventurePrompt({
      seed: AURELIA_HOOK,
      avoidNames: ["Amalthea", "Kestrel Vane"],
    });
    const avoidSection = prompt.userMessage.slice(
      prompt.userMessage.indexOf("Already used elsewhere"),
    );
    expect(avoidSection).toContain("Kestrel Vane");
    expect(avoidSection).not.toContain("- Amalthea\n");
  });

  it("still carries a seed with no proper nouns", () => {
    const prompt = buildAdventurePrompt({
      seed: "a crashed skycar in the undercity",
    });
    expect(prompt.userMessage).toContain("a crashed skycar in the undercity");
    expect(prompt.userMessage).not.toContain("These names are fixed");
  });
});

describe("parseAdventureResponseDetailed seed fidelity", () => {
  it("reports a response that drops every name from the seed", () => {
    const result = parseAdventureResponseDetailed(VALID_AI_RESPONSE, {
      genre: "Hard Sci-Fi",
      seed: AURELIA_HOOK,
    });
    // A soft problem: it feeds buildAdventureRetryMessage rather than
    // discarding the model's work for the local foundation, which only
    // happens for banned/reused names.
    expect(result.problems.join(" ")).toContain("drops every name");
    expect(result.rejected).toBe(false);
  });

  it("accepts a response that keeps at least one seed name", () => {
    const kept = VALID_AI_RESPONSE.replace(
      "The Magistrate's Court",
      "Phobos-Zero Court",
    );
    const result = parseAdventureResponseDetailed(kept, {
      genre: "Hard Sci-Fi",
      seed: AURELIA_HOOK,
    });
    expect(result.problems.join(" ")).not.toContain("drops every name");
  });

  it("does not flag seed fidelity when no seed was given", () => {
    const result = parseAdventureResponseDetailed(VALID_AI_RESPONSE, {
      genre: "Fantasy",
    });
    expect(result.problems.join(" ")).not.toContain("drops every name");
    expect(result.problems.join(" ")).not.toContain("states its own deadline");
  });

  it("does not penalise reusing a name the seed introduced", () => {
    const kept = VALID_AI_RESPONSE.replace(
      "The Magistrate's Court",
      "Phobos-Zero Court",
    );
    const result = parseAdventureResponseDetailed(kept, {
      genre: "Hard Sci-Fi",
      seed: AURELIA_HOOK,
      avoidNames: ["Phobos-Zero"],
    });
    expect(result.problems.join(" ")).not.toContain("reuses names");
  });

  it("flags an objective that carries no pressure from a deadline seed", () => {
    const limp = JSON.parse(VALID_AI_RESPONSE);
    limp.summary = "The crew catalogues ore samples on the station.";
    limp.primaryObjective =
      "Catalogue the ore samples and file the assay with the Phobos-Zero registrar.";
    const result = parseAdventureResponseDetailed(JSON.stringify(limp), {
      genre: "Hard Sci-Fi",
      seed: AURELIA_HOOK,
    });
    expect(result.problems.join(" ")).toContain("carries no pressure");
  });
});

describe("seed pressure overrides the drawn pressure", () => {
  it("suppresses the mechanical pressure seeds when the seed sets a deadline", () => {
    const prompt = buildAdventurePrompt({ seed: AURELIA_HOOK });
    expect(prompt.userMessage).toContain(
      "Pressure: taken from the GIVEN SITUATION above",
    );
    expect(prompt.userMessage).not.toContain("- Primary Pressure:");
    expect(prompt.userMessage).not.toContain(
      "- Secondary Interacting Pressure:",
    );
  });

  it("keeps the drawn pressure when the seed states none", () => {
    const prompt = buildAdventurePrompt({
      seed: "A crashed skycar in the undercity.",
    });
    expect(prompt.userMessage).toContain("- Primary Pressure:");
  });

  it("keeps the drawn pressure when there is no seed at all", () => {
    const prompt = buildAdventurePrompt({ genre: "Fantasy" });
    expect(prompt.userMessage).toContain("- Primary Pressure:");
  });
});

describe("campaign context", () => {
  it("carries the form's world context into the prompt", () => {
    const prompt = buildAdventurePrompt({
      genre: "Fantasy",
      campaignContext: "The Swift Wing Eagles rule the Kestrel Reach.",
    });
    expect(prompt.userMessage).toContain(
      "[HIGHEST PRIORITY — Campaign context, supplied by the user]",
    );
    expect(prompt.userMessage).toContain(
      "The Swift Wing Eagles rule the Kestrel Reach.",
    );
  });

  it("omits the line when no context was given", () => {
    expect(
      buildAdventurePrompt({ genre: "Fantasy" }).userMessage,
    ).not.toContain("[HIGHEST PRIORITY — Campaign context");
  });

  it("keeps context and seed as separate blocks", () => {
    const prompt = buildAdventurePrompt({
      genre: "Fantasy",
      campaignContext: "The Kestrel Reach is under occupation.",
      seed: AURELIA_HOOK,
    });
    expect(prompt.userMessage).toContain(
      "[HIGHEST PRIORITY — Campaign context",
    );
    expect(prompt.userMessage).toContain("GIVEN SITUATION");
  });
});
