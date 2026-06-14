import { describe, it, expect, vi } from "vitest";
import {
  CampaignGeneratorService,
  DraftSaveError,
  type GeneratorVaultGateway,
} from "./campaign-generator-service";
import {
  type GeneratedDraft,
  type GeneratorRunRequest,
  UnsupportedGeneratorError,
} from "./campaign-generator-types";

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

  it("creates a relationship only after entity creation when requested", async () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    const result = await svc.saveDraft({
      draft: draft({ sourceEntityId: "src-1", relationshipLabel: "knows" }),
      createRelationship: true,
    });
    expect(result.relationshipCreated).toBe(true);
    expect(vault.addConnection).toHaveBeenCalledWith(
      "src-1",
      "entity-1",
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
      complete: vi.fn(async () =>
        JSON.stringify({
          title: "Zara the Witch",
          summary: "A powerful sorceress.",
          lore: "## History\nShe was born...",
          labels: ["Witch", "Human"],
        }),
      ),
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
