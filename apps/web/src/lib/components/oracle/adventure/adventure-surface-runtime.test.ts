import { describe, expect, it, vi } from "vitest";
import type {
  AdventureSession,
  GroundingContext,
} from "@codex/adventure-engine";
import { DEFAULT_CALENDAR } from "chronology-engine";
import { EntitySchema } from "schema";
import type { AdventureSourceResolver } from "#lib/services/adventure/adventure-context-service.js";
import { configureAdventureSurfaceRuntime } from "./adventure-surface-runtime.js";

vi.mock("#lib/components/generators/campaign-generator-service.js", () => ({
  createCampaignGeneratorService: vi.fn(),
}));
vi.mock("#lib/services/adventure/adventure-background-request.js", () => ({
  createAdventureBackgroundRequest: vi.fn(() => ({ generatorId: "rumour" })),
}));

function setup() {
  const entity = EntitySchema.parse({
    id: "mill",
    title: "Old Mill",
    type: "location",
    content: "The wheel is still.",
    lore: "A hidden cellar.",
    connections: [],
    visibility: "hidden",
    start_date: { year: 12 },
    end_date: { year: 15 },
    date: { year: 13 },
  });
  const search = vi.fn(async () => [{ id: "mill" }, { id: "missing" }]);
  const vault = {
    activeVaultId: "vault-1",
    entities: { mill: entity },
    allEntities: [entity],
    loadEntityContent: vi.fn(async (_id: string) => {}),
    getSpecificVaultHandle: vi.fn(),
    serviceRegistry: {
      ensureInitialized: vi.fn(async () => ({ search: { search } })),
    },
  };
  let resolver!: AdventureSourceResolver;
  const contextService = {
    setResolver: vi.fn((value: AdventureSourceResolver) => {
      resolver = value;
    }),
  };
  const manager = { setWorldEntryRumourGenerator: vi.fn() };
  const configureRepository = vi.fn();
  const generateDraft = vi.fn(async () => ({
    title: "At the Mill",
    content: "A strange noise.",
    lore: "A trapped spirit.",
  }));
  configureAdventureSurfaceRuntime(
    vault as unknown as Parameters<typeof configureAdventureSurfaceRuntime>[0],
    manager,
    {
      getCalendar: () => DEFAULT_CALENDAR,
      getRumourPolicy: () => ({ isEnabled: true, isAvailable: true }),
      getTheme: () => "fantasy",
      contextService,
      configureRepository,
      createGenerator: () =>
        ({ generateDraft }) as unknown as ReturnType<
          NonNullable<
            Parameters<
              typeof configureAdventureSurfaceRuntime
            >[2]["createGenerator"]
          >
        >,
    },
  );
  return {
    vault,
    entity,
    resolver,
    manager,
    configureRepository,
    generateDraft,
    search,
  };
}

describe("adventure surface runtime", () => {
  it("binds repositories and a date-aware world snapshot to the current Vault", async () => {
    const { vault, resolver, configureRepository } = setup();
    expect(configureRepository).toHaveBeenCalledWith(vault);
    expect(await resolver.getWorldSnapshot!("vault-1")).toEqual({
      entities: vault.allEntities,
      calendar: DEFAULT_CALENDAR,
    });
    await expect(resolver.getWorldSnapshot!("other")).rejects.toThrow(
      "vault-not-open",
    );
  });

  it("loads record bodies and metadata for both direct lookup and search", async () => {
    const { resolver, entity, search } = setup();
    const record = await resolver.getById("vault-1", "mill");
    expect(record).toEqual({
      id: entity.id,
      title: entity.title,
      type: entity.type,
      text: entity.content,
      lore: entity.lore,
      connections: entity.connections,
      visibility: entity.visibility,
      start_date: entity.start_date,
      end_date: entity.end_date,
      date: entity.date,
    });
    expect(await resolver.search("vault-1", "mill", 3)).toEqual([record]);
    expect(search).toHaveBeenCalledWith("mill", { limit: 3 });
    expect(await resolver.getById("vault-1", "missing")).toBeNull();
  });

  it("skips blank searches and blank record bodies", async () => {
    const { vault, entity, resolver, search } = setup();
    expect(await resolver.search("vault-1", "  ", 3)).toEqual([]);
    expect(search).not.toHaveBeenCalled();
    entity.content = " \n ";
    expect(await resolver.search("vault-1", "mill", 3)).toEqual([]);
    expect(vault.loadEntityContent).toHaveBeenCalled();
  });

  it("rejects lookup and search if the Vault changes while records load", async () => {
    const { vault, resolver } = setup();
    vault.loadEntityContent.mockImplementation(async () => {
      vault.activeVaultId = "other";
    });
    await expect(resolver.getById("vault-1", "mill")).rejects.toThrow(
      "vault-not-open",
    );
    vault.activeVaultId = "vault-1";
    await expect(resolver.search("vault-1", "mill", 3)).rejects.toThrow(
      "vault-not-open",
    );
  });

  it("rejects stale searches before loading their matches", async () => {
    const { vault, resolver, search } = setup();
    search.mockImplementation(async () => {
      vault.activeVaultId = "other";
      return [{ id: "mill" }];
    });
    await expect(resolver.search("vault-1", "mill", 3)).rejects.toThrow(
      "vault-not-open",
    );
    expect(vault.loadEntityContent).not.toHaveBeenCalled();
  });

  it("registers background generation and returns only the generated draft", async () => {
    const { manager, generateDraft } = setup();
    const callback = manager.setWorldEntryRumourGenerator.mock.calls[0][0];
    const signal = new AbortController().signal;
    const result = await callback(
      {} as AdventureSession,
      signal,
      {} as GroundingContext,
    );
    expect(result).toEqual({
      title: "At the Mill",
      content: "A strange noise.",
      lore: "A trapped spirit.",
    });
    expect(generateDraft).toHaveBeenCalledWith(
      { generatorId: "rumour" },
      signal,
    );
  });

  it("does not generate after cancellation and rejects incomplete output", async () => {
    const { manager, generateDraft } = setup();
    const callback = manager.setWorldEntryRumourGenerator.mock.calls[0][0];
    const controller = new AbortController();
    controller.abort();
    await expect(
      callback(
        {} as AdventureSession,
        controller.signal,
        {} as GroundingContext,
      ),
    ).rejects.toThrow();
    expect(generateDraft).not.toHaveBeenCalled();
    generateDraft.mockResolvedValueOnce({
      title: "Missing",
      content: "",
      lore: "",
    });
    await expect(
      callback({} as AdventureSession, undefined, {} as GroundingContext),
    ).rejects.toThrow("rumour-generator-output-missing");
  });
});
