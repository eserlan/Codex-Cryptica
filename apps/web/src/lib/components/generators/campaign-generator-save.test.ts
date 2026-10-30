import { describe, expect, it, vi } from "vitest";
import { generateBusinessLocal, type GeneratedDraft } from "generator-engine";
import {
  CampaignGeneratorSaver,
  type CampaignSaveContext,
} from "./campaign-generator-save";

const draft: GeneratedDraft = {
  title: "Harbour",
  summary: "A harbour",
  content: "Chronicle",
  lore: "Secret",
  labels: ["place"],
  entityType: "location",
  sourceGeneratorId: "settlement",
  templateApplied: false,
};

function setup() {
  const deps = {
    vault: {
      entities: {
        target: { title: "  Nearby  " },
        source: { title: "Source" },
        saved: { title: "Harbour" },
      },
      selectedEntityId: null as string | null,
      createEntity: vi.fn(async () => "created"),
      addConnection: vi.fn(async () => {}),
      bulkDelete: vi.fn(async () => ({ failedIds: [], cancelledIds: [] })),
    },
    layoutUIStore: { mainViewMode: "graph", isMobile: false },
    revisionService: { pendingDraft: null as unknown },
    saveBusinessToVault: vi.fn(async () => ({ businessId: "business" })),
    savePointCrawlToVault: vi.fn(async () => ({ overviewNoteId: "overview" })),
    openSavedEntityInEditor: vi.fn(),
    publishGeneratedSaved: vi.fn(),
    systemClock: { now: () => 123 },
    blobToFile: vi.fn(() => new File([], "map.png")),
    entityMapLinkingService: { linkImageToEntity: vi.fn(async () => {}) },
  };
  const service = {
    saveDraft: vi.fn(async () => ({
      entityId: "saved",
      relationshipCreated: true,
    })),
  };
  const saver = new CampaignGeneratorSaver(
    deps as unknown as ConstructorParameters<typeof CampaignGeneratorSaver>[0],
  );
  const context: CampaignSaveContext = {
    workflow: {
      launchMode: "contextual",
      sourceEntityId: "source",
      prefillDate: { year: 1, month: 2, day: 3 },
    },
    businessExistingTitles: new Map(),
  };
  return { deps, saver, context, service };
}

describe("campaign generator saving", () => {
  it("creates a skeleton, skips self/source/unmatched connections and stages the generated content", async () => {
    const { deps, saver, context, service } = setup();
    deps.vault.addConnection.mockRejectedValueOnce(
      new Error("already connected"),
    );
    await saver.save(
      {
        ...draft,
        connections: [
          { targetTitle: "NEARBY", relationship: "" },
          { targetTitle: "Source", relationship: "knows" },
          { targetTitle: "Harbour", relationship: "knows" },
          { targetTitle: "Unknown", relationship: "knows" },
          { targetTitle: "Nearby", relationship: "visits" },
        ],
      },
      true,
      context,
      service,
    );
    expect(service.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          summary: "",
          content: undefined,
          lore: "",
          sourceEntityId: "source",
          relationshipLabel: "related",
        }),
        createRelationship: true,
        start_date: context.workflow.prefillDate,
      }),
    );
    expect(deps.vault.addConnection.mock.calls).toEqual([
      ["saved", "target", "related"],
      ["saved", "target", "visits"],
    ]);
    expect(deps.revisionService.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "saved",
        chronicle: "A harbour",
        lore: "Secret",
        timestamp: 123,
        deleteOnDiscard: true,
        generatorSessionCommit: true,
      }),
    );
    expect(deps.openSavedEntityInEditor).toHaveBeenCalledWith(
      "saved",
      "Harbour",
      expect.objectContaining({ isFocusMode: false }),
    );
    expect(deps.publishGeneratedSaved).toHaveBeenCalledOnce();
  });

  it("propagates persistence failure without recording a save or opening the editor", async () => {
    const { deps, saver, context, service } = setup();
    service.saveDraft.mockRejectedValueOnce(new Error("disk full"));
    await expect(saver.save(draft, false, context, service)).rejects.toThrow(
      "disk full",
    );
    expect(deps.publishGeneratedSaved).not.toHaveBeenCalled();
    expect(deps.openSavedEntityInEditor).not.toHaveBeenCalled();
    expect(deps.revisionService.pendingDraft).toBeNull();
  });

  it("links the star system diagram in preference to the constellation and opens in focus mode", async () => {
    const { deps, saver, context, service } = setup();
    const blob = new Blob(["png"]);
    context.exportStarSystem = vi.fn(async () => blob);
    context.exportConstellation = vi.fn(async () => blob);
    deps.layoutUIStore.mainViewMode = "focus";
    await saver.save(
      {
        ...draft,
        bodies: [{}] as GeneratedDraft["bodies"],
        pattern: { stars: [{}] } as GeneratedDraft["pattern"],
      },
      false,
      context,
      service,
    );
    expect(context.exportStarSystem).toHaveBeenCalledOnce();
    expect(context.exportConstellation).not.toHaveBeenCalled();
    expect(deps.entityMapLinkingService.linkImageToEntity).toHaveBeenCalledWith(
      expect.any(File),
      "Harbour Map",
      "saved",
    );
    expect(deps.openSavedEntityInEditor).toHaveBeenCalledWith(
      "saved",
      "Harbour",
      expect.objectContaining({ isFocusMode: true }),
    );
  });

  it("keeps the save when a constellation export or journal publication fails", async () => {
    const { deps, saver, context, service } = setup();
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    context.exportConstellation = vi.fn(async () => {
      throw new Error("rasterisation failed");
    });
    deps.publishGeneratedSaved.mockImplementation(() => {
      throw new Error("journal unavailable");
    });
    await saver.save(
      { ...draft, pattern: { stars: [{}] } as GeneratedDraft["pattern"] },
      false,
      context,
      service,
    );
    expect(
      deps.entityMapLinkingService.linkImageToEntity,
    ).not.toHaveBeenCalled();
    expect(deps.openSavedEntityInEditor).toHaveBeenCalledOnce();
    logger.mockRestore();
  });

  it("passes business choices to the transactional save and honours graph navigation", async () => {
    const { deps, saver, context, service } = setup();
    context.options = {
      businessChoices: { tickedPersonIds: [] },
      openInGraph: true,
    };
    await saver.save(
      { ...draft, business: generateBusinessLocal({}) },
      false,
      context,
      service,
    );
    expect(deps.saveBusinessToVault).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      context.options.businessChoices,
    );
    expect(deps.vault.selectedEntityId).toBe("business");
    expect(deps.layoutUIStore.mainViewMode).toBe("visualization");
    expect(service.saveDraft).not.toHaveBeenCalled();
    expect(deps.revisionService.pendingDraft).toBeNull();
  });

  it("passes selected point-crawl nodes and source relationship, skipping an empty diagram export", async () => {
    const { deps, saver, context, service } = setup();
    context.options = { selectedNodeIds: ["one"] };
    context.exportPointCrawl = vi.fn(async () => null);
    await saver.save(
      { ...draft, pointCrawl: {} as NonNullable<GeneratedDraft["pointCrawl"]> },
      true,
      context,
      service,
    );
    expect(deps.savePointCrawlToVault).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.objectContaining({
        selectedNodeIds: ["one"],
        sourceEntityId: "source",
        createSourceRelationship: true,
      }),
    );
    expect(deps.vault.selectedEntityId).toBe("overview");
    expect(
      deps.entityMapLinkingService.linkImageToEntity,
    ).not.toHaveBeenCalled();
    expect(deps.openSavedEntityInEditor).toHaveBeenCalledWith(
      "overview",
      "Harbour",
      expect.any(Object),
    );
    expect(service.saveDraft).not.toHaveBeenCalled();
  });

  it("does not select an entity or publish success when a point-crawl save fails", async () => {
    const { deps, saver, context, service } = setup();
    deps.savePointCrawlToVault.mockRejectedValueOnce(new Error("write failed"));
    await expect(
      saver.save(
        {
          ...draft,
          pointCrawl: {} as NonNullable<GeneratedDraft["pointCrawl"]>,
        },
        false,
        context,
        service,
      ),
    ).rejects.toThrow("write failed");
    expect(deps.vault.selectedEntityId).toBeNull();
    expect(deps.publishGeneratedSaved).not.toHaveBeenCalled();
  });
});
