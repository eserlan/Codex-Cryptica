import { describe, it, expect, vi } from "vitest";
import {
  CampaignGeneratorService,
  assertValidLanguageFallback,
  composeDraftVaultFields,
  DraftSaveError,
  LanguageGenerationError,
  type GeneratorVaultGateway,
} from "./campaign-generator-service";
import {
  type AIGeneratorGateway,
  type GeneratedDraft,
  type GeneratorRunRequest,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";
import {
  GeneratorSession,
  buildGeneratorLoreEntries,
  draftToAcceptedEntity,
} from "./generator-session";
import { generateLanguageLocal } from "./public-language";

function run(
  generatorId: GeneratorRunRequest["generatorId"],
  overrides: Partial<GeneratorRunRequest> = {},
): GeneratorRunRequest {
  return {
    generatorId,
    options: {},
    useAI: false,
    themeId: "workspace",
    ...overrides,
  };
}

function draft(overrides: Partial<GeneratedDraft> = {}): GeneratedDraft {
  return {
    title: "Kaeldar",
    entityType: "character",
    summary: "A guard.",
    lore: "Lore.",
    labels: ["Human"],
    sourceGeneratorId: "npc",
    templateApplied: false,
    ...overrides,
  };
}

function gateway(
  overrides: Partial<GeneratorVaultGateway> = {},
): GeneratorVaultGateway {
  return {
    canWrite: () => true,
    createEntity: vi.fn(async () => "entity-1"),
    addConnection: vi.fn(async () => undefined),
    ...overrides,
  };
}

function ctx(bannedNames: string[]): GeneratorRunRequest["vaultContext"] {
  return {
    categoryLabels: [],
    neighbors: [],
    worldSample: [],
    existingTitles: [],
    bannedNames,
    labelSuggestions: [],
    includedContext: [],
    applyTemplate: false,
  };
}

function richCtx(): GeneratorRunRequest["vaultContext"] {
  return {
    themeId: "fantasy",
    themeName: "Low Myth",
    currentDate: "1492",
    targetEntityType: "character",
    categoryLabels: [
      { id: "character", label: "Character" },
      { id: "faction", label: "Faction" },
      { id: "location", label: "Location" },
      { id: "item", label: "Item" },
    ],
    templateOutline:
      "## Summary\n## Motives\n## Secrets\n## Hooks\nUse these headings in order.",
    applyTemplate: true,
    sourceEntity: {
      id: "source-1",
      title: "Ash Market",
      type: "location",
      relationship: "origin",
      contentExcerpt:
        "A fire-scarred trading quarter where guild law is enforced by debt.",
      loreExcerpt: "The market bell is rung only when old contracts come due.",
      labels: ["district", "trade"],
    },
    neighbors: Array.from({ length: 5 }, (_, i) => ({
      id: `neighbor-${i}`,
      title: `Neighbor ${i}`,
      type: "character",
      relationship: "connected",
      contentExcerpt:
        "A politically connected figure tied to Ash Market's old contracts.",
      loreExcerpt: "Keeps careful notes on rivals, debts, and forbidden cargo.",
      labels: ["contact"],
    })),
    worldSample: Array.from({ length: 12 }, (_, i) => ({
      id: `world-${i}`,
      title: `World Anchor ${i}`,
      type: i % 2 === 0 ? "faction" : "location",
      contentExcerpt:
        "A campaign anchor with trade disputes, hidden alliances, old grudges, and unresolved hooks.",
      loreExcerpt:
        "Relevant world lore that should inform generated factions, NPCs, items, and places.",
      labels: ["world"],
    })),
    existingTitles: Array.from({ length: 20 }, (_, i) => `Existing Title ${i}`),
    bannedNames: ["Vane"],
    labelSuggestions: ["guild", "debt", "market", "rival"],
    includedContext: [
      "theme",
      "categories",
      "source",
      "neighbors",
      "world",
      "titles",
      "labels",
    ],
  };
}

function aiJson(title: string): string {
  return JSON.stringify({ title, summary: "s", lore: "l", labels: [] });
}

function languageAiJson(mutate?: (value: Record<string, any>) => void): string {
  const local = generateLanguageLocal(
    {
      genre: "Classic Fantasy",
      tone: "Lyrical & Vowel-rich",
      role: "Common Speech",
      structure: "Compound Words",
    },
    () => 0.42,
  );
  const value: Record<string, any> = {
    version: 1,
    title: local.title,
    summary: local.summary,
    labels: local.labels,
    profile: structuredClone(local.languageProfile),
  };
  value.profile.culture = {
    speakers: "River traders",
    usage: "Used for trade and navigation",
  };
  value.profile.lexicon = value.profile.lexicon.map(
    (entry: Record<string, any>, index: number) => ({
      ...entry,
      id: `word-${index}`,
      partOfSpeech: index === 0 ? "noun" : "verb",
      syllables: [entry.word],
      demonstrates: index === 0 ? ["sound-shape"] : undefined,
    }),
  );
  value.profile.phonology = {
    consonants: [
      ...value.profile.lexicon.map((entry: Record<string, any>) => entry.word),
      "qa",
    ],
    vowels: ["a"],
    phonotactics: ["Each test source is one declared surface unit."],
    syllablePatterns: ["C"],
    rhythm: "Even, with open syllables",
  };
  value.profile.rules = [
    {
      id: "sound-shape",
      domain: "phonology",
      description: "Sources use one declared surface unit.",
    },
    {
      id: "role-suffix",
      domain: "morphology",
      description: "The role suffix follows a lexical root.",
    },
    {
      id: "name-pattern",
      domain: "naming",
      description: "Personal names combine a root and role suffix.",
    },
    {
      id: "root-order",
      domain: "grammar",
      description: "Subjects precede actions in declarative clauses.",
    },
    {
      id: "formal-use",
      domain: "register",
      description: "The first phrase demonstrates formal use.",
    },
  ];
  value.profile.morphology = {
    wordFormation: "Compound roots take a final role marker.",
    suffixes: [{ sourceId: "keeper-suffix", form: "qa", meaning: "keeper" }],
    morphemes: [
      {
        id: "keeper-suffix",
        form: "qa",
        pronunciation: "kah",
        meaning: "keeper",
        kind: "suffix",
        syllables: ["qa"],
      },
    ],
  };
  value.profile.naming.personalNamePatterns = ["Root + role marker"];
  value.profile.naming.structuredPatterns = [
    {
      id: "person-root-role",
      use: "person",
      structure: value.profile.inputs.structure,
      slots: ["root", "role"],
    },
  ];
  value.profile.naming.examples = value.profile.lexicon
    .slice(0, 4)
    .map((entry: Record<string, any>) => ({
      name: `${entry.word}qa`,
      pronunciation: `${entry.pronunciation} kah`,
      meaning: `${entry.meaning} keeper`,
      use: "person",
      patternId: "person-root-role",
      components: [
        {
          slot: "root",
          surface: entry.word,
          pronunciation: entry.pronunciation,
          meaning: entry.meaning,
          sourceId: entry.id,
          syllables: entry.syllables,
        },
        {
          slot: "role",
          surface: "qa",
          pronunciation: "kah",
          meaning: "keeper",
          sourceId: "keeper-suffix",
          syllables: ["qa"],
        },
      ],
      demonstrates: ["role-suffix", "name-pattern"],
    }));
  value.title = value.profile.naming.examples[0].name;
  value.profile.grammar.examples = [0, 1, 2].map((index) => {
    const first = value.profile.lexicon[index];
    const second = value.profile.lexicon[index + 1];
    const translation = `${first.meaning} ${second.meaning}`;
    return {
      text: `${first.word} ${second.word}`,
      pronunciation: `${first.pronunciation} ${second.pronunciation}`,
      translation,
      literalTranslation: translation,
      construction: "declarative",
      components: [first, second].map(
        (entry: Record<string, any>, componentIndex: number) => ({
          slot: componentIndex === 0 ? "subject" : "action",
          surface: entry.word,
          pronunciation: entry.pronunciation,
          meaning: entry.meaning,
          sourceId: entry.id,
          syllables: entry.syllables,
        }),
      ),
      demonstrates: index === 0 ? ["root-order", "formal-use"] : ["root-order"],
    };
  });
  mutate?.(value);
  return JSON.stringify(value);
}

describe("generateDraft", () => {
  it("produces a draft for each supported generator with useAI false", async () => {
    const svc = new CampaignGeneratorService();
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const d = await svc.generateDraft(run(id, { useAI: false }));
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.entityType.length).toBeGreaterThan(0);
      expect(d.sourceGeneratorId).toBe(id);
    }
  });

  it("throws for an unsupported generator id", async () => {
    const svc = new CampaignGeneratorService();
    await expect(svc.generateDraft(run("dragon" as never))).rejects.toThrow(
      UnsupportedGeneratorError,
    );
  });

  it("does not call the vault during generation", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    await svc.generateDraft(run("npc"));
    expect(vault.createEntity).not.toHaveBeenCalled();
    expect(vault.addConnection).not.toHaveBeenCalled();
  });

  it("raises a clear error instead of returning an invalid local language", () => {
    expect(() =>
      assertValidLanguageFallback({
        title: "Broken",
        summary: "Incomplete",
        lore: "",
        labels: ["language"],
      }),
    ).toThrow(LanguageGenerationError);
  });
});

describe("saveDraft", () => {
  it("creates an entity and returns its id", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    const result = await svc.saveDraft({
      draft: draft(),
      createRelationship: false,
    });
    expect(result.entityId).toBe("entity-1");
    expect(result.relationshipCreated).toBe(false);
    expect(vault.createEntity).toHaveBeenCalledWith(
      "character",
      "Kaeldar",
      expect.objectContaining({ lore: "Lore.", labels: ["Human"] }),
    );
  });

  it("adds kind: 'language' to initialData when saving a language draft", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    const result = await svc.saveDraft({
      draft: draft({ sourceGeneratorId: "language", entityType: "note" }),
      createRelationship: false,
    });
    expect(result.entityId).toBe("entity-1");
    expect(vault.createEntity).toHaveBeenCalledWith(
      "note",
      "Kaeldar",
      expect.objectContaining({ kind: "language" }),
    );
  });

  it("persists the canonical language profile with its version", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    const generated = await svc.generateDraft(run("language"));

    await svc.saveDraft({
      draft: generated,
      createRelationship: false,
    });

    expect(vault.createEntity).toHaveBeenCalledWith(
      "note",
      generated.title,
      expect.objectContaining({
        kind: "language",
        languageProfileVersion: 1,
        languageProfile: generated.languageProfile,
      }),
    );
  });

  it("stores a dungeon summary as content and combines its document with GM lore", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    await svc.saveDraft({
      draft: draft({
        sourceGeneratorId: "dungeon",
        entityType: "location",
        summary: "A contested glass sanctuary.",
        content: "## History & Original Purpose\nForged by dragonfire.",
        lore: "## Central Secret / Boss Mystery\nA star sleeps below.",
        labels: ["dungeon", "location"],
      }),
      createRelationship: false,
    });

    expect(vault.createEntity).toHaveBeenCalledWith(
      "location",
      "Kaeldar",
      expect.objectContaining({
        content: "A contested glass sanctuary.",
        lore: "## History & Original Purpose\nForged by dragonfire.\n\n## Central Secret / Boss Mystery\nA star sleeps below.",
        kind: "dungeon",
      }),
    );
  });

  it("does not merge rich content into lore for ordinary entity drafts", () => {
    expect(
      composeDraftVaultFields(
        draft({
          content: "Public presentation",
          lore: "Private notes",
        }),
      ),
    ).toEqual({
      content: "A guard.",
      lore: "Private notes",
    });
  });

  it("creates a relationship only after entity creation when requested", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    const result = await svc.saveDraft({
      draft: draft({ sourceEntityId: "src-1", relationshipLabel: "knows" }),
      createRelationship: true,
    });
    expect(result.relationshipCreated).toBe(true);
    // Linked outbound from the new entity to its source.
    expect(vault.addConnection).toHaveBeenCalledWith(
      "entity-1",
      "src-1",
      "knows",
    );
  });

  it("blocks save with a user-readable error when the campaign is read-only", async () => {
    const vault = gateway({ canWrite: () => false });
    const svc = new CampaignGeneratorService({ vault });
    await expect(
      svc.saveDraft({ draft: draft(), createRelationship: false }),
    ).rejects.toThrow(DraftSaveError);
    expect(vault.createEntity).not.toHaveBeenCalled();
  });

  it("blocks save when no campaign/vault is available", async () => {
    const svc = new CampaignGeneratorService();
    await expect(
      svc.saveDraft({ draft: draft(), createRelationship: false }),
    ).rejects.toThrow(/no campaign/i);
  });

  it("requires a title and entity type before saving", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    await expect(
      svc.saveDraft({ draft: draft({ title: "" }), createRelationship: false }),
    ).rejects.toThrow(/title/i);
    await expect(
      svc.saveDraft({
        draft: draft({ entityType: "" }),
        createRelationship: false,
      }),
    ).rejects.toThrow(/entity type/i);
  });

  it("creates an entity passing labels array correctly", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    await svc.saveDraft({
      draft: draft({ labels: ["Human", "Guard"] }),
      createRelationship: false,
    });
    expect(vault.createEntity).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ labels: ["Human", "Guard"] }),
    );
  });

  it("preserves the draft (throws without side effects) when persistence fails", async () => {
    const vault = gateway({
      createEntity: vi.fn(async () => {
        throw new Error("disk full");
      }),
    });
    const svc = new CampaignGeneratorService({ vault });
    const d = draft();
    await expect(
      svc.saveDraft({ draft: d, createRelationship: false }),
    ).rejects.toThrow();
    expect(vault.addConnection).not.toHaveBeenCalled();
    // Draft object is untouched and remains available for retry.
    expect(d.title).toBe("Kaeldar");
  });
});

// T040: theme defaults are applied but user options override them
describe("theme defaults (US3)", () => {
  it("applies theme defaults to generation request", async () => {
    const svc = new CampaignGeneratorService();
    const d = await svc.generateDraft(run("npc", { themeId: "fantasy" }));
    expect(d.sourceGeneratorId).toBe("npc");
  });

  it("user-provided options override theme defaults", async () => {
    const svc = new CampaignGeneratorService();
    const d = await svc.generateDraft(
      run("npc", { themeId: "horror", options: { classLabel: "Hero" } }),
    );
    expect(d.sourceGeneratorId).toBe("npc");
  });

  it("unknown theme id falls back gracefully", async () => {
    const svc = new CampaignGeneratorService();
    const d = await svc.generateDraft(run("npc", { themeId: "gothic" }));
    expect(d.sourceGeneratorId).toBe("npc");
  });
});

// T032: AI policy — forced non-AI generation and context minimization
describe("AI policy (US2)", () => {
  it("generates a draft with useAI false without calling any vault method", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    const d = await svc.generateDraft(run("npc", { useAI: false }));
    expect(d.title.length).toBeGreaterThan(0);
    expect(vault.createEntity).not.toHaveBeenCalled();
    expect(vault.addConnection).not.toHaveBeenCalled();
  });

  it("respects useAI false for all supported generators", async () => {
    const svc = new CampaignGeneratorService();
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const d = await svc.generateDraft(run(id, { useAI: false }));
      expect(d.sourceGeneratorId).toBe(id);
    }
  });

  it("draft generation does not read or write vault state", async () => {
    const vault = gateway({ canWrite: vi.fn(() => true) });
    const svc = new CampaignGeneratorService({ vault });
    await svc.generateDraft(run("faction", { useAI: false }));
    expect(vault.canWrite).not.toHaveBeenCalled();
    expect(vault.createEntity).not.toHaveBeenCalled();
    expect(vault.addConnection).not.toHaveBeenCalled();
  });

  it("uses AI gateway when useAI is true and policy allows", async () => {
    const aiGateway = {
      complete: vi.fn(async () => ({
        text: JSON.stringify({
          title: "Zara the Witch",
          summary: "A powerful sorceress.",
          lore: "## History\nShe was born...",
          labels: ["Witch", "Human"],
        }),
        usedInteraction: true,
        interactionId: "interaction-1",
      })),
    };
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });
    const d = await svc.generateDraft(run("npc", { useAI: true }));
    expect(aiGateway.complete).toHaveBeenCalledTimes(1);
    expect(d.title).toBe("Zara the Witch");
    expect(d.labels).toContain("Witch");
  });

  it("parses the internal dungeon generator's AI-specific response shape", async () => {
    const aiGateway = {
      complete: vi.fn(async () =>
        JSON.stringify({
          title: "The Bellfound Depths",
          summary:
            "A drowned signal foundry contested by oath-bound salvagers.",
          throughline:
            "Rebel smiths built the foundry, a ritual flood ruined it, and rival salvagers now fight over its living bells.",
          history:
            "Rebel smiths cast warning bells here until a failed silencing rite flooded the lower works.",
          currentState:
            "The upper galleries remain occupied while black water rises through the furnaces.",
          signatureFeature:
            "A suspended bronze bell rings when anyone speaks a lie.",
          factions: [
            {
              name: "The Rivet Oath",
              identity: "Oath-bound smiths guarding the bells they cast.",
              virtue: "Patient",
              vice: "Possessive",
              goal: "Recover the drowned bell-forge before the water claims it.",
              drive: "Recovery",
              obstacle: "the flooded casting floor",
              origin:
                "Descendants of the rebel smiths who first cast the bells.",
              belief: "They believe the bells must never leave the foundry.",
              territorySectorIds: ["sector-1"],
              strength:
                "Total command of the only dry route through the works.",
              leader: {
                name: "Hask Rivet",
                description:
                  "the last smith who remembers the original casting rite",
              },
              notable: {
                name: "Coen Bellwright",
                description: "keeps the bell ledger no one else can read",
              },
              relationship:
                "They need the Siltbound's diving engine to reach the lower works before the flood wins.",
            },
            {
              name: "The Siltbound",
              identity:
                "Salvagers who broke in through the flooded lower works.",
              virtue: "Resourceful",
              vice: "Vindictive",
              goal: "Escape with the bell-key before the tide rises again.",
              drive: "Escape",
              obstacle: "their broken diving engine",
              origin:
                "Salvagers who came for scrap and got trapped by the flood.",
              belief:
                "They believe the Rivet Oath is hoarding the only way out.",
              territorySectorIds: ["sector-2"],
              strength: "Detailed knowledge of the flooded lower passages.",
              leader: {
                name: "Marrow Vex",
                description: "the diver who first found the drowned belfry",
              },
              notable: {
                name: "Ilsa Dray",
                description: "the only one who can still repair the engine",
              },
              relationship:
                "They need the Rivet Oath's bell-key to silence the alarm before they can leave.",
            },
          ],
          factionSituation:
            "The Rivet Oath needs the Siltbound engine, while the Siltbound need the Oath's bell-key.",
          sectors: [
            {
              name: "The Riveted Mouth",
              description:
                "Flood doors shudder around a gallery of cracked warning bells.",
              stockType: "Lore",
              stockDetail:
                "Strike marks identify which bell opened each floodgate.",
            },
            {
              name: "The Drowned Belfry",
              description:
                "A tilted casting hall descends beneath oil-black water.",
              stockType: "Trap",
              stockDetail:
                "Speaking above a whisper releases a suspended clapper.",
            },
          ],
          secret:
            "The bells are a lock keeping the river beneath the foundry asleep.",
          hazards: ["Sudden floodgate releases", "Falling bronze moulds"],
          treasures: ["The bell-key", "A case of rebel maker's marks"],
          hooks: [
            "Recover a bell that rings with a missing heir's voice.",
            "Stop both factions from sounding the river alarm.",
          ],
        }),
      ),
    };
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });

    const generated = await svc.generateDraft(
      run("dungeon", {
        useAI: true,
        themeId: "fantasy",
        options: {
          purpose: "Forge for a Great Weapon",
          currentState: "Active Monster Lair",
          scale: "Small Lair (2 Sectors)",
        },
      }),
    );

    // The coherence/repair pass now always runs once after a valid first
    // pass, since hard validation alone doesn't catch semantic issues.
    expect(aiGateway.complete).toHaveBeenCalledTimes(2);
    expect(aiGateway.complete.mock.calls[0][1]).toContain(
      "TTRPG dungeon designer",
    );
    expect(aiGateway.complete.mock.calls[1][1]).toContain(
      "proofreading and repairing",
    );
    expect(generated.title).toBe("The Bellfound Depths");
    expect(generated.content).toContain("The Riveted Mouth");
    expect(generated.lore).toContain("The bells are a lock");
  });

  it("runs council-vote as four turns on one chat session (foundation, repair, paths, paths-repair) and merges the repaired outputs", async () => {
    const foundationJson = JSON.stringify({
      title: "The Salt Road Levy",
      summary: "A five-seat council must approve emergency funding.",
      lore: "## Voting Procedure\nSimple majority (unrepaired).",
      labels: ["council-vote", "political-intrigue"],
      connections: [],
    });
    const repairedJson = JSON.stringify({
      title: "The Salt Road Levy",
      summary: "A five-seat council must approve emergency funding.",
      lore: "## Voting Procedure\nSimple majority.",
      labels: ["council-vote", "political-intrigue"],
      connections: [],
    });
    const pathsJson = JSON.stringify({
      possiblePaths: "## Possible Paths\nsmallest coalition first (unrepaired)",
      followUpHooks: "## Follow-Up Hooks\nthey remember (unrepaired)",
    });
    const pathsRepairedJson = JSON.stringify({
      possiblePaths: "## Possible Paths\nsmallest coalition first",
      followUpHooks: "## Follow-Up Hooks\nthey remember",
    });

    const send = vi
      .fn()
      .mockResolvedValueOnce(foundationJson)
      .mockResolvedValueOnce(repairedJson)
      .mockResolvedValueOnce(pathsJson)
      .mockResolvedValueOnce(pathsRepairedJson);
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });

    const generated = await svc.generateDraft(
      run("council-vote", {
        useAI: true,
        options: { councilSize: "7" },
      }),
    );

    expect(startChat).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(4);
    expect(send.mock.calls[0][0]).toContain("This is step one of two");
    expect(send.mock.calls[1][0]).toContain(
      "proofread and repair the scenario you just wrote above",
    );
    expect(send.mock.calls[2][0]).toContain(
      "Treat everything already established there",
    );
    expect(send.mock.calls[3][0]).toContain(
      'proofread and repair the "Possible Paths" and "Follow-Up Hooks" you just wrote above',
    );
    expect(aiGateway.complete).not.toHaveBeenCalled();
    expect(generated.title).toBe("The Salt Road Levy");
    // Uses the REPAIRED foundation lore and REPAIRED paths, not the
    // unrepaired first-pass versions.
    expect(generated.lore).toBe(
      "## Voting Procedure\nSimple majority.\n\n## Possible Paths\nsmallest coalition first\n\n## Follow-Up Hooks\nthey remember",
    );
    expect(generated.labels).toContain("council-vote");
  });

  it("keeps the unrepaired foundation and unrepaired paths when their repair turns return an unusable shape", async () => {
    const foundationJson = JSON.stringify({
      title: "The Salt Road Levy",
      summary: "A five-seat council must approve emergency funding.",
      lore: "## Voting Procedure\nSimple majority.",
      labels: ["council-vote"],
      connections: [],
    });
    const pathsJson = JSON.stringify({
      possiblePaths: "## Possible Paths\nx",
      followUpHooks: "## Follow-Up Hooks\ny",
    });

    const send = vi
      .fn()
      .mockResolvedValueOnce(foundationJson)
      .mockResolvedValueOnce(JSON.stringify({ foo: "bar" }))
      .mockResolvedValueOnce(pathsJson)
      .mockResolvedValueOnce(JSON.stringify({ foo: "bar" }));
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });

    const generated = await svc.generateDraft(
      run("council-vote", { useAI: true, options: { councilSize: "7" } }),
    );

    expect(send).toHaveBeenCalledTimes(4);
    expect(generated.title).toBe("The Salt Road Levy");
    expect(generated.lore).toContain("## Voting Procedure\nSimple majority.");
    expect(generated.lore).toContain("## Possible Paths\nx");
  });

  it("keeps the unrepaired paths when the paths-repair reply is missing one required field", async () => {
    const foundationJson = JSON.stringify({
      title: "The Salt Road Levy",
      summary: "A five-seat council must approve emergency funding.",
      lore: "## Voting Procedure\nSimple majority.",
      labels: ["council-vote"],
      connections: [],
    });
    const pathsJson = JSON.stringify({
      possiblePaths: "## Possible Paths\nx",
      followUpHooks: "## Follow-Up Hooks\ny",
    });
    // Only possiblePaths present — a real defect this catches: an isUsable
    // check using || instead of && would accept this and silently drop the
    // original followUpHooks.
    const partialPathsRepair = JSON.stringify({
      possiblePaths: "## Possible Paths\nz",
    });

    const send = vi
      .fn()
      .mockResolvedValueOnce(foundationJson)
      .mockResolvedValueOnce(foundationJson)
      .mockResolvedValueOnce(pathsJson)
      .mockResolvedValueOnce(partialPathsRepair);
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });

    const generated = await svc.generateDraft(
      run("council-vote", { useAI: true, options: { councilSize: "7" } }),
    );

    // The partial repair must be rejected wholesale, keeping BOTH original
    // fields — not just possiblePaths with followUpHooks blanked out.
    expect(generated.lore).toContain("## Possible Paths\nx");
    expect(generated.lore).toContain("## Follow-Up Hooks\ny");
    expect(generated.lore).not.toContain("## Possible Paths\nz");
  });

  it("falls back to local council-vote generation when the gateway has no startChat", async () => {
    const aiGateway = { complete: vi.fn() };
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });

    const generated = await svc.generateDraft(
      run("council-vote", { useAI: true, options: { councilSize: "3" } }),
    );

    expect(aiGateway.complete).not.toHaveBeenCalled();
    expect(generated.lore).toContain("## Council Members");
  });

  it("falls back to local council-vote generation when the foundation pass returns an unusable shape", async () => {
    const send = vi.fn().mockResolvedValueOnce(JSON.stringify({ foo: "bar" }));
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });

    const generated = await svc.generateDraft(
      run("council-vote", { useAI: true, options: { councilSize: "3" } }),
    );

    // Only the foundation turn should have been attempted before bailing.
    expect(send).toHaveBeenCalledTimes(1);
    expect(generated.lore).toContain("## Council Members");
  });

  it("does not commit a rejected dungeon interaction replaced by a stateless retry", async () => {
    const corrected = {
      title: "The Corrected Depths",
      summary: "A corrected two-sector delve.",
      throughline:
        "A sealed forge failed and two rivals now contest its heart.",
      history: "The forge was sealed after its central bell cracked.",
      currentState: "Two rival crews occupy separate galleries.",
      signatureFeature: "A cracked bell vibrates above every doorway.",
      factionSituation: "Each crew needs the mechanism held by the other.",
      factions: [
        {
          name: "The Rivet Oath",
          virtue: "Patient",
          vice: "Possessive",
          goal: "Recovery",
          obstacle: "the flooded floor",
        },
        {
          name: "The Siltbound",
          virtue: "Resourceful",
          vice: "Vindictive",
          goal: "Escape",
          obstacle: "their broken engine",
        },
      ],
      sectors: [
        {
          name: "The Riveted Mouth",
          description: "Cracked doors guard the upper works.",
          stockType: "Lore",
          stockDetail: "Maker marks reveal the original lock sequence.",
        },
        {
          name: "The Drowned Belfry",
          description: "Black water fills the lower casting hall.",
          stockType: "Trap",
          stockDetail: "Loud speech releases a suspended clapper.",
        },
      ],
      secret: "The central bell restrains the river below.",
      hazards: ["Floodgate releases", "Falling bronze moulds"],
      treasures: ["The bell-key", "Rebel maker marks"],
      hooks: ["Recover the bell-key.", "Prevent the final flood."],
    };
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValueOnce({
        text: JSON.stringify({ title: "Rejected Fragment" }),
        usedInteraction: true,
        interactionId: "interaction-rejected",
      })
      .mockResolvedValueOnce(JSON.stringify(corrected));
    const onInteractionResult = vi.fn();
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
      onInteractionResult,
    });

    const generated = await service.generateDraft(
      run("dungeon", {
        useAI: true,
        themeId: "fantasy",
        options: { scale: "Small Lair (2 Sectors)" },
        interaction: {
          input: "Generate the next delve.",
          previousInteractionId: "interaction-previous",
          store: true,
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(2);
    expect(generated.title).toBe("The Corrected Depths");
    expect(typeof generated.summary).toBe("string");
    expect(onInteractionResult).not.toHaveBeenCalled();
  });

  it("sends a targeted proofread pass, not a full regenerate, for an accepted response with lingering gaps", async () => {
    // Structurally sound (right sector/faction count, distinct names/drives/
    // goals), but each faction is missing several mandatory fields — a
    // content gap, not a rejection. That should trigger the repair prompt,
    // not the original "write a new dungeon" prompt again.
    const sectors = [
      {
        name: "The Riveted Mouth",
        description: "Flood doors shudder around a gallery of cracked bells.",
        stockType: "Lore",
        stockDetail: "Strike marks identify which bell opened each floodgate.",
      },
      {
        name: "The Drowned Belfry",
        description: "A tilted casting hall descends beneath black water.",
        stockType: "Trap",
        stockDetail: "Speaking above a whisper releases a suspended clapper.",
      },
    ];
    const sparseFactions = [
      {
        name: "The Rivet Oath",
        virtue: "Patient",
        vice: "Possessive",
        goal: "Recover the drowned bell-forge.",
        drive: "Recovery",
        obstacle: "the flooded casting floor",
      },
      {
        name: "The Siltbound",
        virtue: "Resourceful",
        vice: "Vindictive",
        goal: "Escape before the tide rises again.",
        drive: "Escape",
        obstacle: "their broken diving engine",
      },
    ];
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValueOnce(
        JSON.stringify({
          title: "The Bellfound Depths",
          summary: "A drowned signal foundry contested by rival salvagers.",
          throughline: "Rebel smiths built it; a flood ruined it.",
          history: "Rebel smiths cast warning bells here.",
          currentState: "Rival crews occupy separate galleries.",
          signatureFeature: "A suspended bronze bell rings when anyone lies.",
          sectors,
          factionSituation: "Each crew needs what the other holds.",
          factions: sparseFactions,
          secret: "The bells keep the river beneath the foundry asleep.",
          hazards: ["Sudden floodgate releases"],
          treasures: ["The bell-key"],
          hooks: ["Recover a bell that rings with a missing heir's voice."],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: "The Bellfound Depths",
          summary: "A drowned signal foundry contested by rival salvagers.",
          throughline: "Rebel smiths built it; a flood ruined it.",
          history: "Rebel smiths cast warning bells here.",
          currentState: "Rival crews occupy separate galleries.",
          signatureFeature: "A suspended bronze bell rings when anyone lies.",
          sectors,
          factionSituation: "Each crew needs what the other holds.",
          factions: sparseFactions.map((f, i) => ({
            ...f,
            identity: "A crew of rival salvagers.",
            origin: "Salvagers drawn in after the flood.",
            belief: "They believe the other crew is stalling.",
            territorySectorIds: [`sector-${i + 1}`],
            strength: "Detailed knowledge of the flooded lower works.",
            leader: {
              name: "Hask Rivet",
              description: "the last smith who remembers the rite",
            },
            notable: {
              name: "Ilsa Dray",
              description: "the only one who can repair the engine",
            },
            relationship:
              "Watching the other crew for a sign they're about to break.",
          })),
          secret: "The bells keep the river beneath the foundry asleep.",
          hazards: ["Sudden floodgate releases"],
          treasures: ["The bell-key"],
          hooks: ["Recover a bell that rings with a missing heir's voice."],
        }),
      );
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("dungeon", {
        useAI: true,
        themeId: "fantasy",
        options: { scale: "Small Lair (2 Sectors)" },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(2);
    // The second call must be the proofread/repair prompt, not the original
    // "write an original dungeon" prompt sent again.
    expect(complete.mock.calls[1][1]).toContain("proofreading and repairing");
    expect(complete.mock.calls[1][0]).toContain("Previous output to repair");
    expect(generated.title).toBe("The Bellfound Depths");
    expect(generated.content).toContain("Hask Rivet");
  });

  it("passes interaction request through to the AI gateway when present", async () => {
    const complete = vi.fn<AIGeneratorGateway["complete"]>(async () => ({
      text: JSON.stringify({
        title: "Threaded",
        summary: "s",
        lore: "l",
        labels: [],
      }),
      usedInteraction: true,
      interactionId: "interaction-2",
    }));
    const onInteractionResult = vi.fn();
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
      onInteractionResult,
    });
    await svc.generateDraft(
      run("npc", {
        useAI: true,
        vaultContext: ctx(["Vane"]),
        interaction: {
          input: "delta context plus request",
          previousInteractionId: "interaction-1",
          store: true,
        },
      }),
    );
    expect(onInteractionResult).toHaveBeenCalledWith(
      expect.objectContaining({ interactionId: "interaction-2" }),
    );
    expect(complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        interaction: expect.objectContaining({
          input: expect.stringContaining("Return ONLY a JSON object"),
          previousInteractionId: "interaction-1",
          replayPrompt: expect.stringContaining(
            "do NOT title it any of these names",
          ),
        }),
      }),
    );
    const interaction = complete.mock.calls[0][2]?.interaction;
    expect(interaction?.input).toContain("delta context plus request");
    expect(interaction?.input).not.toContain(
      "do NOT title it any of these names",
    );
  });

  it("reports prompt metrics for stateless and interaction-backed AI generations", async () => {
    const metrics = vi.fn();
    const complete = vi.fn<AIGeneratorGateway["complete"]>(async () => ({
      text: JSON.stringify({
        title: "Threaded",
        summary: "s",
        lore: "l",
        labels: [],
      }),
      usedInteraction: true,
      interactionId: "interaction-2",
    }));
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
      onPromptMetrics: metrics,
    });

    await svc.generateDraft(
      run("npc", {
        useAI: true,
        vaultContext: ctx(["Vane"]),
        interaction: {
          input:
            "[GENERATOR VAULT CONTEXT]\nDelta only\n\n[GENERATOR REQUEST]\n",
          previousInteractionId: "interaction-1",
          store: true,
        },
      }),
    );

    expect(metrics).toHaveBeenCalledWith(
      expect.objectContaining({
        generatorId: "npc",
        usedInteraction: true,
        replayed: false,
      }),
    );
    const interactionMetrics = metrics.mock.calls[0][0];
    expect(interactionMetrics.fullPromptChars).toBeGreaterThan(
      interactionMetrics.sentPromptChars,
    );
    expect(interactionMetrics.savedPromptChars).toBeGreaterThan(0);
    expect(interactionMetrics.estimatedSavedTokens).toBeGreaterThan(0);

    metrics.mockClear();
    complete.mockResolvedValueOnce(
      JSON.stringify({
        title: "Stateless",
        summary: "s",
        lore: "l",
        labels: [],
      }),
    );

    await svc.generateDraft(run("npc", { useAI: true, vaultContext: ctx([]) }));

    expect(metrics).toHaveBeenCalledWith(
      expect.objectContaining({
        generatorId: "npc",
        usedInteraction: false,
        replayed: false,
        savedPromptChars: 0,
        estimatedSavedTokens: 0,
      }),
    );
  });

  it("compares representative flow prompt size with interactions against stateless calls", async () => {
    const flow: Array<GeneratorRunRequest["generatorId"]> = [
      "faction",
      "npc",
      "npc",
      "npc",
      "npc",
      "magic-item",
      "settlement",
      "settlement",
      "settlement",
      "settlement",
      "faction",
    ];
    const context = richCtx();
    const statelessMetrics: Array<{
      fullPromptChars: number;
      sentPromptChars: number;
    }> = [];
    const interactionMetrics: Array<{
      fullPromptChars: number;
      sentPromptChars: number;
      savedPromptChars: number;
    }> = [];

    const stateless = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: {
        complete: vi.fn(async (_prompt, _system, options) => {
          expect(options?.interaction).toBeUndefined();
          return aiJson(`Stateless ${statelessMetrics.length}`);
        }),
      },
      onPromptMetrics: (metrics) => statelessMetrics.push(metrics),
    });

    for (const generatorId of flow) {
      await stateless.generateDraft(
        run(generatorId, { useAI: true, vaultContext: context }),
      );
    }

    const session = new GeneratorSession();
    const interactive = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: {
        complete: vi.fn(async (_prompt, _system, options) => {
          expect(options?.interaction).toBeDefined();
          return {
            text: aiJson(`Interactive ${interactionMetrics.length}`),
            usedInteraction: true,
            interactionId: `interaction-${interactionMetrics.length}`,
          };
        }),
      },
      onInteractionResult: (result) => {
        if (result.interactionId) {
          session.commitTurn(
            result.interactionId,
            buildGeneratorLoreEntries(context),
          );
        }
      },
      onPromptMetrics: (metrics) => interactionMetrics.push(metrics),
    });

    for (const generatorId of flow) {
      const turn = session.prepareTurn({
        instruction: `Generate ${generatorId}.`,
        loreEntries: buildGeneratorLoreEntries(context),
      });
      const draft = await interactive.generateDraft(
        run(generatorId, {
          useAI: true,
          instructions: `Generate ${generatorId}.`,
          vaultContext: context,
          interaction: {
            input: turn.input,
            previousInteractionId: turn.previousInteractionId,
            store: true,
          },
        }),
      );
      session.commitAcceptedEntity(draftToAcceptedEntity(draft.title, draft));
    }

    const statelessSent = statelessMetrics.reduce(
      (total, metrics) => total + metrics.sentPromptChars,
      0,
    );
    const interactionSent = interactionMetrics.reduce(
      (total, metrics) => total + metrics.sentPromptChars,
      0,
    );

    expect(statelessMetrics).toHaveLength(flow.length);
    expect(interactionMetrics).toHaveLength(flow.length);
    expect(interactionMetrics[0].savedPromptChars).toBe(0);
    expect(interactionMetrics[1].savedPromptChars).toBeGreaterThan(0);
    expect(interactionSent).toBeLessThan(statelessSent);
  });

  it("falls back to local generation when AI gateway throws", async () => {
    const aiGateway = {
      complete: vi.fn(async () => {
        throw new Error("network error");
      }),
    };
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });
    const d = await svc.generateDraft(run("npc", { useAI: true }));
    expect(d.title.length).toBeGreaterThan(0);
    expect(d.sourceGeneratorId).toBe("npc");
  });

  it("falls back to local generation when AI returns invalid JSON", async () => {
    const aiGateway = {
      complete: vi.fn(async () => "not valid json at all"),
    };
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway,
    });
    const d = await svc.generateDraft(run("faction", { useAI: true }));
    expect(d.sourceGeneratorId).toBe("faction");
  });

  it("accepts a structurally valid, rich language result on the first AI call", async () => {
    const complete = vi.fn(async () => languageAiJson());
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(1);
    expect(generated.languageProfileVersion).toBe(1);
    expect(generated.languageProfile?.culture?.speakers).toBe("River traders");
  });

  it("keeps language generation stateless instead of revising the previous interaction", async () => {
    const complete = vi.fn(async () =>
      languageAiJson((value) => {
        value.profile.inputs.role = "Imperial Standard";
        value.profile.register.role = "Imperial Standard";
        value.summary = "A formal language used as the Imperial Standard.";
      }),
    );
    const onInteractionResult = vi.fn();
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
      onInteractionResult,
    });

    await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Imperial Standard",
          structure: "Compound Words",
        },
        interaction: {
          input: "Generate another language.",
          previousInteractionId: "previous-language-response",
          store: true,
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0][0]).toContain(
      "- Language Role: Imperial Standard",
    );
    expect(complete.mock.calls[0][2]).toEqual({
      generationConfig: {
        temperature: 0.35,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
    expect(onInteractionResult).not.toHaveBeenCalled();
  });

  it("makes one targeted language repair after an AI quality failure", async () => {
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValueOnce(
        languageAiJson((value) => {
          value.profile.naming.examples = value.profile.naming.examples.slice(
            0,
            2,
          );
        }),
      )
      .mockResolvedValueOnce(languageAiJson());
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0]).toContain(
      "Include at least 4 example names.",
    );
    expect(complete.mock.calls[1][0]).toContain("Previous response:");
    expect(complete.mock.calls[1][0]).toContain(
      "Preserve the existing title and summary exactly",
    );
    expect(complete.mock.calls[1][0]).toContain(
      "Make the smallest possible correction",
    );
    expect(complete.mock.calls[1][0]).toContain(
      "Original resolved request (schema omitted):",
    );
    expect(complete.mock.calls[1][0]).not.toContain(
      "Return a valid JSON object matching this structure exactly",
    );
    expect(generated.languageProfileVersion).toBe(1);
  });

  it("keeps a parseable AI language when advisory issues remain after repair", async () => {
    const advisoryOnly = languageAiJson((value) => {
      value.profile.phonology.syllablePatterns = ["CV"];
    });
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValue(advisoryOnly);
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0]).toContain(
      "outside the declared sound inventory",
    );
    expect(generated.title).toBe(JSON.parse(advisoryOnly).title);
  });

  it("sends internal consistency failures through targeted repair", async () => {
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValueOnce(
        languageAiJson((value) => {
          value.profile.grammar.examples[0].components[0].pronunciation =
            "changed";
        }),
      )
      .mockResolvedValueOnce(languageAiJson());
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0]).toContain("changes pronunciation");
    expect(generated.languageProfileVersion).toBe(1);
  });

  it("accepts an advisory-only first repair without consuming another call", async () => {
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValueOnce(
        languageAiJson((value) => {
          value.profile.naming.examples = value.profile.naming.examples.slice(
            0,
            2,
          );
        }),
      )
      .mockResolvedValueOnce(
        languageAiJson((value) => {
          value.profile.grammar.examples = value.profile.grammar.examples.slice(
            0,
            1,
          );
        }),
      )
      .mockResolvedValueOnce(languageAiJson());
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0]).toContain("Repair the following");
    expect(complete.mock.calls[1][2]).toEqual({
      generationConfig: {
        temperature: 0.35,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
    expect(generated.languageProfileVersion).toBe(1);
  });

  it("keeps the second targeted repair when the first repair call fails", async () => {
    const complete = vi
      .fn<AIGeneratorGateway["complete"]>()
      .mockResolvedValueOnce("{}")
      .mockRejectedValueOnce(new Error("repair unavailable"))
      .mockResolvedValueOnce(languageAiJson());
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(
      run("language", {
        useAI: true,
        options: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
      }),
    );

    expect(complete).toHaveBeenCalledTimes(3);
    expect(generated.languageProfileVersion).toBe(1);
  });

  it("uses the validated local profile after the fixed three-call AI budget", async () => {
    const complete = vi.fn<AIGeneratorGateway["complete"]>(async () => "{}");
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });

    const generated = await svc.generateDraft(run("language", { useAI: true }));

    expect(complete).toHaveBeenCalledTimes(3);
    expect(generated.languageProfileVersion).toBe(1);
    expect(generated.languageProfile?.lexicon).toHaveLength(10);
  });

  it("retries AI generation when it returns a banned name, then accepts a clean one", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(aiJson("Vane-Smithe"))
      .mockResolvedValueOnce(aiJson("Aric Dawnward"));
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const d = await svc.generateDraft(
      run("npc", { useAI: true, vaultContext: ctx(["Vane"]) }),
    );
    expect(complete).toHaveBeenCalledTimes(2);
    expect(d.title).toBe("Aric Dawnward");
  });

  it("parses and normalises connections from AI output", async () => {
    const complete = vi.fn(async () =>
      JSON.stringify({
        title: "Aric Dawnward",
        summary: "s",
        lore: "l",
        labels: [],
        connections: [
          { targetTitle: "The Salt Concord", relationship: "member of" },
          { targetTitle: "Greywick", relationship: "" }, // empty rel -> "related"
          { relationship: "ally" }, // no targetTitle -> dropped
          "garbage", // wrong shape -> dropped
        ],
      }),
    );
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const d = await svc.generateDraft(run("npc", { useAI: true }));
    expect(d.connections).toEqual([
      { targetTitle: "The Salt Concord", relationship: "member of" },
      { targetTitle: "Greywick", relationship: "related" },
    ]);
  });

  it("leaves connections undefined when AI omits them", async () => {
    const complete = vi.fn(async () =>
      JSON.stringify({ title: "Solo", summary: "s", lore: "l", labels: [] }),
    );
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const d = await svc.generateDraft(run("npc", { useAI: true }));
    expect(d.connections).toBeUndefined();
  });

  it("falls back to local generation when AI keeps returning banned names", async () => {
    const complete = vi.fn(async () => aiJson("Vane-Smithe"));
    const svc = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const d = await svc.generateDraft(
      run("npc", { useAI: true, vaultContext: ctx(["Vane"]) }),
    );
    expect(complete).toHaveBeenCalledTimes(3);
    expect(d.title.toLowerCase()).not.toContain("vane");
    expect(d.sourceGeneratorId).toBe("npc");
  });
});
