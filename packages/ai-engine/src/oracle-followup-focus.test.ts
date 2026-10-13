import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleGenerator } from "@codex/oracle-engine";
import { DefaultContextRetrievalService } from "./context-retrieval.service";

/**
 * #4055: a pronoun follow-up must stay on the record the conversation is
 * about, from query resolution through retrieval to the answer prompt, even
 * when search ranks a similarly named record first.
 */
describe("Oracle follow-up focus (#4055)", () => {
  const filler = "Archives and old letters. ".repeat(90);
  const entities: Record<string, any> = {
    elara: {
      id: "elara",
      title: "Elara Voss",
      categoryId: "character",
      aliases: ["Grand Archmage"],
      content: "Grand Archmage of the Violet Spire.",
    },
    elira: {
      id: "elira",
      title: "Elira Zöldmező",
      categoryId: "character",
      content: `Hedge witch of the marsh. ${filler}`,
    },
    ashford: {
      id: "ashford",
      title: "Ashford",
      categoryId: "location",
      content: "A river city.",
    },
  };
  for (let i = 0; i < 6; i++) {
    entities[`d${i}`] = {
      id: `d${i}`,
      title: `Distractor ${i}`,
      categoryId: "note",
      content: filler,
    };
  }
  // Search always prefers the distractors, as semantic search did for
  // "four facts about her".
  const distractorHits = [
    { id: "elira", score: 0.92 },
    ...Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, score: 0.8 })),
  ];

  let messages: any[];
  let generateResponse: ReturnType<typeof vi.fn>;
  let expandQuery: ReturnType<typeof vi.fn>;
  let context: any;
  const generator = new OracleGenerator();

  beforeEach(() => {
    messages = [];
    generateResponse = vi.fn().mockResolvedValue(undefined);
    expandQuery = vi.fn(async (_k: string, q: string) => q);
    const search = vi.fn(async (q: string) =>
      q.startsWith("art style") ? [] : distractorHits,
    );
    context = {
      chatHistory: { messages },
      effectiveApiKey: "key",
      textGeneration: { expandQuery, generateResponse },
      contextRetrieval: new DefaultContextRetrievalService({ search } as any),
      vault: {
        id: "v1",
        entities,
        inboundConnections: {},
        selectedEntityId: null,
      },
      categories: [],
      modelName: "model",
      isDemoMode: false,
    };
  });

  /** Mirrors the chat executor: add the turn, answer it, save the focus id. */
  async function ask(query: string) {
    const user = { role: "user", content: query } as any;
    const assistant = { role: "assistant", content: "" } as any;
    messages.push(user, assistant);
    const { primaryEntityId } = await generator.generateChatResponse(
      query,
      context,
      () => {},
    );
    user.entityId = primaryEntityId;
    assistant.entityId = primaryEntityId;
    assistant.content = `An answer about ${entities[primaryEntityId!]?.title}.`;
    const call = generateResponse.mock.calls.at(-1)!;
    return { primaryEntityId, modelQuery: call[1], lore: call[3] as string };
  }

  it("keeps 'her' on Elara Voss across follow-ups", async () => {
    expect((await ask("Tell me about Elara Voss")).primaryEntityId).toBe(
      "elara",
    );

    const facts = await ask("Give me a four facts about her");
    expect(facts.primaryEntityId).toBe("elara");
    expect(facts.lore).toContain("File: Elara Voss");
    expect(facts.modelQuery).toContain('refer to "Elara Voss"');
    expect(facts.modelQuery).not.toContain("Elira");
    // The id-based focus replaces the free-text pronoun guesser.
    expect(expandQuery).not.toHaveBeenCalled();

    const allies = await ask("Who are her allies?");
    expect(allies.primaryEntityId).toBe("elara");
  });

  it("moves the focus when the user names a different character", async () => {
    await ask("Tell me about Elara Voss");
    expect((await ask("Tell me about Elira Zöldmező")).primaryEntityId).toBe(
      "elira",
    );

    const born = await ask("Where was she born?");
    expect(born.primaryEntityId).toBe("elira");
    expect(born.modelQuery).toContain('refer to "Elira Zöldmező"');
  });

  it("does not pin a character to 'that city'", async () => {
    await ask("Tell me about Elara Voss");
    const city = await ask("Who rules that city?");
    expect(city.modelQuery).not.toContain("[CONVERSATION FOCUS]");
    expect(expandQuery).toHaveBeenCalled();
  });

  it("does not reveal a hidden focus record to a guest", async () => {
    context.vault.isGuest = true;
    context.vault.defaultVisibility = "hidden";
    messages.push(
      { role: "user", content: "Tell me about Elara Voss", entityId: "elara" },
      { role: "assistant", content: "…", entityId: "elara" },
    );
    const { modelQuery, lore } = await ask("Give me four facts about her");
    expect(modelQuery).not.toContain("Elara Voss");
    expect(lore).not.toContain("Elara Voss");
  });
});
