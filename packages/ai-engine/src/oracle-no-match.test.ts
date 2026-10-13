import { describe, it, expect, vi } from "vitest";
import { OracleGenerator } from "@codex/oracle-engine";
import { DefaultContextRetrievalService } from "./context-retrieval.service";
import { isUnrelatedSuggestedSearch } from "./retrieval-evidence";

const entities: Record<string, any> = {
  elara: {
    id: "elara", title: "Elara Voss", type: "character", categoryId: "character",
    content: "The archmage directs the Violet Spire.",
    aliases: ["Grand Archmage"], labels: [],
  },
  elira: {
    id: "elira", title: "Elira Zöldmező", type: "character", categoryId: "character",
    content: "A riverside herbalist who trades willow bark.",
    aliases: [], labels: [],
  },
  lantern: {
    id: "lantern", title: "The Night Ledger", type: "note",
    content: "An old inventory of provisions.",
    lore: "The sapphire beacon is submerged beneath the eastern reef.",
    labels: [],
  },
  hidden: {
    id: "hidden", title: "Shadow Rite", type: "note",
    content: "The forbidden Shadow Rite opens the underworld.",
    labels: ["hidden"], aliases: [],
  },
};

const mockVault = (overrides: Record<string, any> = {}) => ({
  entities,
  allEntities: Object.values(entities),
  titleAndAliasIndex: [
    { entityId: "elara", lowercaseText: "elara voss", actualTitle: "Elara Voss", status: "active", isAlias: false },
    { entityId: "elara", lowercaseText: "grand archmage", actualTitle: "Elara Voss", status: "active", isAlias: true },
    { entityId: "elira", lowercaseText: "elira zöldmező", actualTitle: "Elira Zöldmező", status: "active", isAlias: false },
    { entityId: "lantern", lowercaseText: "the night ledger", actualTitle: "The Night Ledger", status: "active", isAlias: false },
    { entityId: "hidden", lowercaseText: "shadow rite", actualTitle: "Shadow Rite", status: "active", isAlias: false, labels: ["hidden"] },
  ],
  selectedEntityId: null,
  inboundConnections: {},
  defaultVisibility: "visible",
  isGuest: false,
  id: "no-match-test",
  ...overrides,
});

const createService = (hits: { id: string; score: number }[]) => {
  const search = vi.fn(async (query: string) =>
    query.startsWith("art style") ? [] : hits,
  );
  return { service: new DefaultContextRetrievalService({ search } as any), search };
};

describe("Oracle no-match confidence guard (#4066)", () => {
  it("does not treat a high-scoring unrelated suggestion as a primary entity", async () => {
    const { service } = createService([{ id: "elira", score: 0.999 }]);
    const result = await service.retrieveContext(
      "quantum tomato whale engine", new Set(), mockVault() as any,
    );

    expect(result.noRelevantMatch).toBe(true);
    expect(result.primaryEntityId).toBeUndefined();
    expect(result.sourceIds).toEqual([]);
    expect(result.content).toContain("No relevant Vault evidence");
    expect(result.content).not.toContain("File: Elira");
    expect(result.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "__retrieval_status__" })]),
    );
  });

  it("preserves true named/alias subjects even when another hit ranks first", async () => {
    const { service } = createService([
      { id: "elira", score: 0.99 },
      { id: "elara", score: 0.9 },
    ]);
    const result = await service.retrieveContext(
      "Tell me about Grand Archmage Elara Voss", new Set(), mockVault() as any,
    );
    expect(result.primaryEntityId).toBe("elara");
    expect(result.noRelevantMatch).toBe(false);
    expect(result.content).toContain("File: Elara Voss");
  });

  it("retains lore-only hits and Unicode words", async () => {
    const { service } = createService([{ id: "lantern", score: 0.8 }]);
    const result = await service.retrieveContext(
      "What do we know about the sapphire beacon?", new Set(), mockVault() as any,
    );
    expect(result.noRelevantMatch).toBe(false);
    expect(result.primaryEntityId).toBe("lantern");
    expect(result.content).toContain("sapphire beacon");
    expect(isUnrelatedSuggestedSearch("Who is Elira Zöldmező?", [
      { id: "elira" },
    ], { entities } as any)).toBe(false);
  });

  it("does not override selected-file intent with a no-match guess", async () => {
    const { service } = createService([{ id: "elira", score: 0.95 }]);
    const result = await service.retrieveContext(
      "quantum tomato whale engine", new Set(),
      mockVault({ selectedEntityId: "elara" }) as any,
    );
    expect(result.primaryEntityId).toBe("elara");
    expect(result.noRelevantMatch).toBe(false);
  });

  it("keeps a stable follow-up on Elara despite unrelated search suggestions", async () => {
    const { service } = createService([{ id: "elira", score: 0.96 }]);
    const result = await service.retrieveContext(
      "Tell me more", new Set(), mockVault() as any, "elara",
    );
    expect(result.primaryEntityId).toBe("elara");
    expect(result.noRelevantMatch).toBe(false);
  });

  it("never treats hidden guest records as evidence", async () => {
    const { service } = createService([{ id: "hidden", score: 0.98 }]);
    const result = await service.retrieveContext(
      "What is the forbidden Shadow Rite?", new Set(),
      mockVault({ isGuest: true }) as any,
    );
    expect(result.noRelevantMatch).toBe(true);
    expect(result.sourceIds).toEqual([]);
    expect(result.content).not.toContain("Shadow Rite");
  });

  it("instructs the current LLM turn, including the Interactions path, not to assume canon", async () => {
    const { service } = createService([{ id: "elira", score: 0.999 }]);
    const generateResponse = vi.fn(async () => undefined);
    const generator = new OracleGenerator();
    const context: any = {
      effectiveApiKey: "test",
      contextRetrieval: service,
      chatHistory: { messages: [] },
      textGeneration: { generateResponse, expandQuery: vi.fn() },
      vault: mockVault(),
      categories: [],
      modelName: "model",
      isDemoMode: false,
      interactionsEnabled: true,
      vaultId: "v1",
    };
    const result = await generator.generateChatResponse(
      "quantum tomato whale engine", context, () => {},
    );
    expect(result.primaryEntityId).toBeUndefined();
    expect(generateResponse.mock.calls[0][1]).toContain(
      "No matching Vault evidence",
    );
    expect(generateResponse.mock.calls[0][8].loreEntries).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "__retrieval_status__" })]),
    );
  });
});
