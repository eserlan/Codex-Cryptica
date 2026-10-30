import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  CampaignGeneratorRequestBuilder,
  collectSourceConnections,
} from "./campaign-generator-request";

const entity = (id: string, title: string, targets: string[] = []) =>
  ({
    id,
    title,
    type: "location",
    content: "",
    labels: [],
    aliases: [],
    status: "active",
    connections: targets.map((target) => ({
      target,
      type: "related",
      strength: 1,
    })),
  }) as Entity;

function setup() {
  const entities = {
    source: entity("source", "Anchor", ["outbound"]),
    inbound: entity("inbound", "Neighbour", ["source"]),
    outbound: entity("outbound", "Far shore"),
  };
  const deps = {
    vault: {
      entities,
      getActiveFolderHandle: vi.fn(async () => null),
      getActiveVaultHandle: vi.fn(async () => null),
      loadEntityContent: vi.fn(async () => {}),
    },
    categories: { list: [{ id: "location", label: "Location" }] },
    themeStore: {
      worldThemeId: "fantasy",
      activeTheme: { name: "Fantasy", description: "A world" },
    },
    calendarStore: { config: { presentYear: 42, epochLabel: "AE" } },
    entityTemplateService: {
      resolveTemplate: vi.fn(async () => "## Appearance"),
    },
    searchService: { search: vi.fn(async () => [{ id: "inbound" }]) },
    interactionSessions: { enabled: true },
    generatorSessionManager: {
      enabled: true,
      prepare: vi.fn(() => ({
        input: "turn",
        previousInteractionId: "previous",
      })),
    },
  };
  const builder = new CampaignGeneratorRequestBuilder(
    deps as unknown as ConstructorParameters<
      typeof CampaignGeneratorRequestBuilder
    >[0],
  );
  return { builder, deps };
}

const policy = { isEnabled: true, isAvailable: true };

describe("campaign generator request", () => {
  it("collects inbound and outbound connections without including unrelated entities", () => {
    const { deps } = setup();
    expect([
      ...collectSourceConnections(deps.vault.entities, "source"),
    ]).toEqual(["outbound", "inbound"]);
    expect([
      ...collectSourceConnections(deps.vault.entities, "missing"),
    ]).toEqual([]);
  });

  it("builds context and an interaction using the trimmed instruction and calendar", async () => {
    const { builder, deps } = setup();
    const result = await builder.build(
      {
        generatorId: "ship",
        options: {},
        useAI: true,
        instructions: "  A trading ship  ",
      },
      "source",
      () => policy,
    );
    expect(result.instructions).toBe("A trading ship");
    expect(result.vaultContext).toEqual(
      expect.objectContaining({
        currentDate: "42 AE",
        templateOutline: "## Appearance",
        applyTemplate: true,
      }),
    );
    expect(deps.entityTemplateService.resolveTemplate).toHaveBeenCalledWith(
      "ship",
      "fantasy",
      null,
    );
    expect(deps.searchService.search).toHaveBeenCalledWith("A trading ship", {
      limit: 8,
    });
    expect(result.interaction).toEqual({
      input: "turn",
      previousInteractionId: "previous",
      store: true,
    });
  });

  it("falls back to system templates and type sampling when vault handles and search fail", async () => {
    const { builder, deps } = setup();
    deps.vault.getActiveFolderHandle.mockRejectedValueOnce(
      new Error("unavailable"),
    );
    deps.searchService.search.mockRejectedValueOnce(new Error("no index"));
    const result = await builder.build(
      { generatorId: "npc", options: {}, useAI: false },
      "source",
      () => policy,
    );
    expect(deps.entityTemplateService.resolveTemplate).toHaveBeenCalledWith(
      "location",
      "fantasy",
    );
    expect(result.instructions).toBeTruthy();
    expect(result.interaction).toBeUndefined();
    expect(deps.generatorSessionManager.prepare).not.toHaveBeenCalled();
  });

  it("does not start interactions when AI is disabled and propagates a failed default template", async () => {
    const { builder, deps } = setup();
    await builder.build(
      { generatorId: "npc", options: {}, useAI: true },
      null,
      () => ({ ...policy, isEnabled: false }),
    );
    expect(deps.generatorSessionManager.prepare).not.toHaveBeenCalled();
    expect(deps.searchService.search).not.toHaveBeenCalled();
    deps.entityTemplateService.resolveTemplate.mockRejectedValue(
      new Error("template unavailable"),
    );
    await expect(
      builder.build(
        { generatorId: "npc", options: {}, useAI: false },
        null,
        () => policy,
      ),
    ).rejects.toThrow("template unavailable");
  });
  it("uses the latest event year when the calendar has no present year and ignores unavailable naming notes", async () => {
    const { builder, deps } = setup();
    deps.calendarStore.config.presentYear = 0;
    deps.vault.entities.source.start_date = { year: 77, month: 1, day: 1 };
    deps.vault.entities.source.labels = ["Stormber culture"];
    Object.assign(deps.vault.entities, {
      naming: {
        ...entity("naming", "Stormber naming conventions"),
        type: "note",
      },
    });
    deps.vault.loadEntityContent.mockRejectedValueOnce(
      new Error("unavailable"),
    );
    const result = await builder.build(
      { generatorId: "ship", options: {}, useAI: false },
      "source",
      () => policy,
    );
    expect(result.vaultContext?.currentDate).toBe("77 AE");
    expect(deps.vault.loadEntityContent).toHaveBeenCalledWith("naming");
  });

  it("reads the current AI policy after preparing vault context", async () => {
    const { builder, deps } = setup();
    let enabled = true;
    deps.searchService.search.mockImplementationOnce(async () => {
      enabled = false;
      return [];
    });
    const result = await builder.build(
      {
        generatorId: "npc",
        options: {},
        useAI: true,
        instructions: "A sailor",
      },
      null,
      () => ({ isEnabled: enabled, isAvailable: true }),
    );
    expect(result.interaction).toBeUndefined();
    expect(deps.generatorSessionManager.prepare).not.toHaveBeenCalled();
  });
});
