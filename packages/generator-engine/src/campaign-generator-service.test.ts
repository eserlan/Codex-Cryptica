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

describe("generateDraft", () => {
  it("produces a draft for each supported generator with useAI false", () => {
    const svc = new CampaignGeneratorService();
    for (const id of ["npc", "faction", "settlement", "magic-item"] as const) {
      const d = svc.generateDraft(run(id, { useAI: false }));
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.entityType.length).toBeGreaterThan(0);
      expect(d.sourceGeneratorId).toBe(id);
    }
  });

  it("throws for an unsupported generator id", () => {
    const svc = new CampaignGeneratorService();
    expect(() => svc.generateDraft(run("dragon" as never))).toThrow(
      UnsupportedGeneratorError,
    );
  });

  it("does not call the vault during generation", () => {
    const vault = gateway();
    const svc = new CampaignGeneratorService({ vault });
    svc.generateDraft(run("npc"));
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
