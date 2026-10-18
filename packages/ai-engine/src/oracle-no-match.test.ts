import { describe, it, expect, vi } from "vitest";
import { OracleGenerator } from "@codex/oracle-engine";
import { DefaultContextRetrievalService } from "./context-retrieval.service";
import { isUnrelatedSuggestedSearch } from "./retrieval-evidence";

const entities: Record<string, any> = {
  elara: {
    id: "elara",
    title: "Elara Voss",
    type: "character",
    categoryId: "character",
    content: "The archmage directs the Violet Spire.",
    aliases: ["Grand Archmage"],
    labels: [],
  },
  elira: {
    id: "elira",
    title: "Elira Zöldmező",
    type: "character",
    categoryId: "character",
    content: "A riverside herbalist who trades willow bark.",
    aliases: [],
    labels: [],
  },
  lantern: {
    id: "lantern",
    title: "The Night Ledger",
    type: "note",
    content: "An old inventory of provisions.",
    lore: "The sapphire beacon is submerged beneath the eastern reef.",
    labels: [],
  },
  hidden: {
    id: "hidden",
    title: "Shadow Rite",
    type: "note",
    content: "The forbidden Shadow Rite opens the underworld.",
    labels: ["hidden"],
    aliases: [],
  },
};

const mockVault = (overrides: Record<string, any> = {}) => ({
  entities,
  allEntities: Object.values(entities),
  titleAndAliasIndex: [
    {
      entityId: "elara",
      lowercaseText: "elara voss",
      actualTitle: "Elara Voss",
      status: "active",
      isAlias: false,
    },
    {
      entityId: "elara",
      lowercaseText: "grand archmage",
      actualTitle: "Elara Voss",
      status: "active",
      isAlias: true,
    },
    {
      entityId: "elira",
      lowercaseText: "elira zöldmező",
      actualTitle: "Elira Zöldmező",
      status: "active",
      isAlias: false,
    },
    {
      entityId: "lantern",
      lowercaseText: "the night ledger",
      actualTitle: "The Night Ledger",
      status: "active",
      isAlias: false,
    },
    {
      entityId: "hidden",
      lowercaseText: "shadow rite",
      actualTitle: "Shadow Rite",
      status: "active",
      isAlias: false,
      labels: ["hidden"],
    },
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
  return {
    service: new DefaultContextRetrievalService({ search } as any),
    search,
  };
};

describe("Oracle no-match confidence guard (#4066)", () => {
  it("does not treat a high-scoring unrelated suggestion as a primary entity", async () => {
    const { service } = createService([{ id: "elira", score: 0.999 }]);
    const result = await service.retrieveContext(
      "quantum tomato whale engine",
      new Set(),
      mockVault() as any,
    );

    expect(result.noRelevantMatch).toBe(true);
    expect(result.primaryEntityId).toBeUndefined();
    expect(result.sourceIds).toEqual([]);
    expect(result.content).toContain("No relevant Vault evidence");
    expect(result.content).not.toContain("File: Elira");
    // The note stays out of the Interactions lore delta, which never withdraws
    // an entry once sent.
    expect(result.entries.map((e) => e.id)).not.toContain(
      "__retrieval_status__",
    );
  });

  it("preserves true named/alias subjects even when another hit ranks first", async () => {
    const { service } = createService([
      { id: "elira", score: 0.99 },
      { id: "elara", score: 0.9 },
    ]);
    const result = await service.retrieveContext(
      "Tell me about Grand Archmage Elara Voss",
      new Set(),
      mockVault() as any,
    );
    expect(result.primaryEntityId).toBe("elara");
    expect(result.noRelevantMatch).toBe(false);
    expect(result.content).toContain("File: Elara Voss");
  });

  it("retains lore-only hits and Unicode words", async () => {
    const { service } = createService([{ id: "lantern", score: 0.8 }]);
    const result = await service.retrieveContext(
      "What do we know about the sapphire beacon?",
      new Set(),
      mockVault() as any,
    );
    expect(result.noRelevantMatch).toBe(false);
    expect(result.primaryEntityId).toBe("lantern");
    expect(result.content).toContain("sapphire beacon");
    expect(
      isUnrelatedSuggestedSearch("Who is Elira Zöldmező?", [{ id: "elira" }], {
        entities,
      } as any),
    ).toBe(false);
  });

  it("does not override selected-file intent with a no-match guess", async () => {
    const { service } = createService([{ id: "elira", score: 0.95 }]);
    const result = await service.retrieveContext(
      "quantum tomato whale engine",
      new Set(),
      mockVault({ selectedEntityId: "elara" }) as any,
    );
    expect(result.sourceIds).toContain("elara");
    expect(result.content).toContain("[ACTIVE FILE] File: Elara Voss");
    expect(result.noRelevantMatch).toBe(false);
  });

  it("keeps a stable follow-up on Elara despite unrelated search suggestions", async () => {
    const { service } = createService([{ id: "elira", score: 0.96 }]);
    const result = await service.retrieveContext(
      "Tell me more (about Elara Voss)",
      new Set(),
      mockVault() as any,
      "elara",
    );
    expect(result.primaryEntityId).toBe("elara");
    expect(result.noRelevantMatch).toBe(false);
  });

  it("never treats hidden guest records as evidence", async () => {
    const { service } = createService([{ id: "hidden", score: 0.98 }]);
    const result = await service.retrieveContext(
      "What is the forbidden Shadow Rite?",
      new Set(),
      mockVault({ isGuest: true }) as any,
    );
    expect(result.noRelevantMatch).toBe(true);
    expect(result.sourceIds).toEqual([]);
    expect(result.content).not.toContain("Shadow Rite");
  });

  it("instructs only the current LLM turn, including the Interactions path, not to assume canon", async () => {
    const { service } = createService([{ id: "elira", score: 0.999 }]);
    const generateResponse = vi.fn(async (..._args: any[]) => undefined);
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
      "quantum tomato whale engine",
      context,
      () => {},
    );
    expect(result.primaryEntityId).toBeUndefined();
    expect(generateResponse.mock.calls[0][1]).toContain(
      "No matching Vault evidence",
    );
    expect(
      generateResponse.mock.calls[0][8].loreEntries.map((e: any) => e.id),
    ).not.toContain("__retrieval_status__");
  });

  it("drops the no-match status on a later turn that finds evidence", async () => {
    const { service, search } = createService([{ id: "elira", score: 0.999 }]);
    await service.retrieveContext(
      "quantum tomato whale engine",
      new Set(),
      mockVault() as any,
    );
    search.mockImplementation(async (q: string) =>
      q.startsWith("art style") ? [] : [{ id: "lantern", score: 0.8 }],
    );
    const next = await service.retrieveContext(
      "What do we know about the sapphire beacon?",
      new Set(),
      mockVault() as any,
    );
    expect(next.noRelevantMatch).toBe(false);
    expect(next.content).not.toContain("No relevant Vault evidence");
  });

  it("keeps an @-pinned entity as the subject even when no query word matches", async () => {
    const { service } = createService([{ id: "elira", score: 0.999 }]);
    const result = await service.retrieveContext(
      "quantum tomato whale engine",
      new Set(),
      mockVault() as any,
      undefined,
      false,
      { pinnedEntityIds: ["elara"] },
    );
    expect(result.primaryEntityId).toBe("elara");
    expect(result.noRelevantMatch).toBe(false);
    expect(result.content).not.toContain("No relevant Vault evidence");
  });

  it("accepts a hit whose words differ only in form (plural, verb ending)", async () => {
    const dragon = {
      id: "dragon",
      title: "Ancient Dragon",
      type: "creature",
      content: "It guards the mountain pass.",
      labels: [],
      aliases: [],
    };
    const { service } = createService([{ id: "dragon", score: 0.7 }]);
    const vault = mockVault({
      entities: { ...entities, dragon },
      allEntities: [...Object.values(entities), dragon],
    });
    const result = await service.retrieveContext(
      "Which dragons guard the mountains?",
      new Set(),
      vault as any,
    );
    expect(result.noRelevantMatch).toBe(false);
    expect(result.primaryEntityId).toBe("dragon");
  });

  it("does not flag chit-chat or one-word prompts that find nothing", async () => {
    const { service } = createService([]);
    const hello = await service.retrieveContext(
      "Hello there!",
      new Set(),
      mockVault() as any,
    );
    expect(hello.noRelevantMatch).toBe(false);
    expect(hello.content).not.toContain("No relevant Vault evidence");
  });

  it("flags a specific question that finds nothing when there is no conversation subject", async () => {
    const { service } = createService([]);
    const result = await service.retrieveContext(
      "Describe the obsidian lighthouse keepers",
      new Set(),
      mockVault() as any,
    );
    expect(result.noRelevantMatch).toBe(true);
  });

  it("keeps the previous subject on a non-pronoun follow-up that finds nothing", async () => {
    const { service } = createService([]);
    const result = await service.retrieveContext(
      "And the harbour district markets?",
      new Set(),
      mockVault() as any,
      "elara",
    );
    expect(result.noRelevantMatch).toBe(false);
    expect(result.sourceIds).toContain("elara");
  });
});
