import { describe, it, expect, vi } from "vitest";
import {
  CampaignGeneratorService,
  DraftSaveError,
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
            "Do NOT use any of these names",
          ),
        }),
      }),
    );
    const interaction = complete.mock.calls[0][2]?.interaction;
    expect(interaction?.input).toContain("delta context plus request");
    expect(interaction?.input).not.toContain("Do NOT use any of these names");
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
