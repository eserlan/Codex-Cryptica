import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GuestChatExecutor } from "./guest-chat-executor";

const originalNavigator = globalThis.navigator;

// ─── shared helpers ───────────────────────────────────────────────────────────

function makeContext(
  entityOverrides: Record<string, any> = {},
  extra: Record<string, any> = {},
) {
  return {
    chatHistory: {
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      getMessages: vi.fn().mockResolvedValue([]),
      setMessages: vi.fn(),
      messages: [],
    },
    eventBus: { emit: vi.fn() },
    vault: { entities: entityOverrides },
    effectiveApiKey: "mock-key",
    modelName: "mock-model",
    textGeneration: { generateResponse: vi.fn().mockResolvedValue(undefined) },
    ...extra,
  } as any;
}

function makeCharacter(overrides: Record<string, any> = {}) {
  return {
    id: "char-1",
    title: "Blacksmith Joe",
    type: "character",
    content: "Joe works at the forge.",
    lore: "## Personality & Voice\n- Deep voice.\n\n## Knowledge & Expertise\n- Iron work.",
    connections: [],
    guestChatConfig: { isEnabled: true, contextScope: "public" },
    ...overrides,
  };
}

function systemPromptFrom(ctx: any) {
  return ctx.textGeneration.generateResponse.mock.calls[0][8]
    .systemInstructionOverride as string;
}

// ─── offline / disabled ───────────────────────────────────────────────────────

describe("GuestChatExecutor", () => {
  beforeEach(() => {
    (globalThis as any).navigator = { onLine: true };
  });
  afterEach(() => {
    (globalThis as any).navigator = originalNavigator;
  });

  it("handles offline mode", async () => {
    (globalThis as any).navigator = { onLine: false };
    const executor = new GuestChatExecutor();
    const addMessage = vi.fn();
    const ctx = {
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
    } as any;
    await executor.execute(
      { type: "guest-chat", query: "hello", entityId: "char-1" },
      ctx,
    );
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "system",
        content: expect.stringContaining("offline"),
      }),
    );
  });

  it("rejects disabled or personality-less characters", async () => {
    const executor = new GuestChatExecutor();
    const addMessage = vi.fn();
    const generateResponse = vi.fn();
    const ctx = makeContext(
      {
        "char-1": {
          id: "char-1",
          type: "character",
          guestChatConfig: { isEnabled: false },
        },
      },
      { textGeneration: { generateResponse } },
    );
    ctx.chatHistory.addMessage = addMessage;

    await executor.execute(
      { type: "guest-chat", query: "hello", entityId: "char-1" },
      ctx,
    );
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("no longer available"),
      }),
    );
    expect(generateResponse).not.toHaveBeenCalled();
  });

  // ─── system prompt structure ──────────────────────────────────────────────────

  it("includes OUTPUT FORMAT block before role-play content", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({ "char-1": makeCharacter() });
    await executor.execute(
      { type: "guest-chat", query: "Who are you?", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("OUTPUT FORMAT");
    expect(prompt).toContain("Begin with the first word");
    expect(prompt.indexOf("OUTPUT FORMAT")).toBeLessThan(
      prompt.indexOf("You are roleplaying"),
    );
  });

  it("emits dialogue-only constraint with prohibited patterns named", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({ "char-1": makeCharacter() });
    await executor.execute(
      { type: "guest-chat", query: "Hello.", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("spoken dialogue only");
    expect(prompt).toContain("stage directions");
    expect(prompt).toContain("Paragraph breaks");
    expect(prompt).toContain("calibration rules");
  });

  it("includes personality, knowledge, and background sections", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({ "char-1": makeCharacter() });
    await executor.execute(
      { type: "guest-chat", query: "Who are you?", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("Joe works at the forge.");
    expect(prompt).toContain("Deep voice.");
    expect(prompt).toContain("Iron work.");
  });

  // ─── relationship graph ───────────────────────────────────────────────────────

  it("includes RELATIONSHIP GRAPH section with [YOU] and [GUEST] markers", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      "char-1": makeCharacter({ connections: [] }),
      "guest-1": {
        id: "guest-1",
        title: "Adventurer",
        type: "character",
        connections: [],
      },
    });
    await executor.execute(
      {
        type: "guest-chat",
        query: "Hello.",
        entityId: "char-1",
        data: { guestCharacterId: "guest-1" },
      },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("RELATIONSHIP GRAPH");
    expect(prompt).toContain("[YOU]");
    expect(prompt).toContain("[GUEST]");
  });

  it("shows direct connection type and label in the graph", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      kardos: makeCharacter({
        id: "kardos",
        title: "Master Kardos",
        content: "Wise wizard.",
        connections: [
          {
            target: "verfarkas",
            type: "friendly",
            label: "mentor of",
            strength: 1,
          },
        ],
      }),
      verfarkas: {
        id: "verfarkas",
        title: "Verfarkas",
        type: "character",
        connections: [],
      },
    });
    await executor.execute(
      {
        type: "guest-chat",
        query: "Hello.",
        entityId: "kardos",
        data: { guestCharacterId: "verfarkas" },
      },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("RELATIONSHIP GRAPH");
    expect(prompt).toContain("friendly");
    expect(prompt).toContain("mentor of");
    expect(prompt).toContain("Verfarkas");
  });

  it("shows transitive path through faction intermediaries in the graph", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      laszlo: makeCharacter({
        id: "laszlo",
        title: "Patriarch László",
        content: "Tribe leader.",
        connections: [
          {
            target: "aranyver",
            type: "friendly",
            label: "leader of",
            strength: 1,
          },
        ],
      }),
      verfarkas: {
        id: "verfarkas",
        title: "Verfarkas",
        type: "character",
        connections: [{ target: "younglings", type: "member_of", strength: 1 }],
      },
      younglings: {
        id: "younglings",
        title: "Younglings",
        type: "faction",
        connections: [{ target: "aranyver", type: "part_of", strength: 1 }],
      },
      aranyver: {
        id: "aranyver",
        title: "Aranyver",
        type: "faction",
        connections: [],
      },
    });
    await executor.execute(
      {
        type: "guest-chat",
        query: "Greetings.",
        entityId: "laszlo",
        data: { guestCharacterId: "verfarkas" },
      },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("RELATIONSHIP GRAPH");
    // All intermediary entities should appear in the graph
    expect(prompt).toContain("Younglings");
    expect(prompt).toContain("Aranyver");
    expect(prompt).toContain("member_of");
    expect(prompt).toContain("part_of");
    expect(prompt).toContain("leader of");
  });

  it("handles reverse edges (faction → character) in graph output", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      laszlo: makeCharacter({
        id: "laszlo",
        title: "Patriarch László",
        content: "Tribe leader.",
        connections: [],
      }),
      verfarkas: {
        id: "verfarkas",
        title: "Verfarkas",
        type: "character",
        connections: [{ target: "younglings", type: "member_of", strength: 1 }],
      },
      younglings: {
        id: "younglings",
        title: "Younglings",
        type: "faction",
        connections: [{ target: "aranyver", type: "part_of", strength: 1 }],
      },
      aranyver: {
        id: "aranyver",
        title: "Aranyver",
        type: "faction",
        // Faction points TO László (reverse edge from character's perspective)
        connections: [{ target: "laszlo", type: "leader_of", strength: 1 }],
      },
    });
    await executor.execute(
      {
        type: "guest-chat",
        query: "Greetings.",
        entityId: "laszlo",
        data: { guestCharacterId: "verfarkas" },
      },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("RELATIONSHIP GRAPH");
    expect(prompt).toContain("Younglings");
    expect(prompt).toContain("Aranyver");
    // Reverse edge should appear as ← in László's entry
    expect(prompt).toContain("←");
  });

  it("instructs the AI to use the graph to determine relationship and tone", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({ "char-1": makeCharacter() });
    await executor.execute(
      { type: "guest-chat", query: "Hello.", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("RELATIONSHIP GRAPH");
    // Rule 4 should tell the AI to interpret the graph
    expect(prompt).toContain("Connection types");
    expect(prompt).toContain("labels");
    expect(prompt).toContain("shared group");
  });

  // ─── world knowledge ─────────────────────────────────────────────────────────

  it("includes WORLD KNOWLEDGE section with public content of directly connected entities", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      kardos: makeCharacter({
        id: "kardos",
        title: "Master Kardos",
        content: "Wise wizard of the sanctum.",
        connections: [
          {
            target: "verfarkas",
            type: "friendly",
            label: "mentor of",
            strength: 1,
          },
          { target: "swift-wing", type: "member_of", strength: 1 },
        ],
      }),
      verfarkas: {
        id: "verfarkas",
        title: "Verfarkas",
        type: "character",
        content: "A young wolf-warrior of the Aranyver band.",
        connections: [],
      },
      "swift-wing": {
        id: "swift-wing",
        title: "Swift Wing Eagles",
        type: "faction",
        content: "An elite scouting faction within the tribe.",
        connections: [],
      },
    });
    await executor.execute(
      { type: "guest-chat", query: "Who do you know?", entityId: "kardos" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("WORLD KNOWLEDGE");
    expect(prompt).toContain("First-level knowledge");
    expect(prompt).toContain("Verfarkas");
    expect(prompt).toContain("young wolf-warrior");
    expect(prompt).toContain("Swift Wing Eagles");
    expect(prompt).toContain("elite scouting faction");
  });

  it("includes 2-hop entities in WORLD KNOWLEDGE at reduced length", async () => {
    const executor = new GuestChatExecutor();
    // Kardos → Swift Wing Eagles → Aranyver (2-hop)
    const ctx = makeContext({
      kardos: makeCharacter({
        id: "kardos",
        title: "Master Kardos",
        content: "Wise wizard.",
        connections: [{ target: "swift-wing", type: "member_of", strength: 1 }],
      }),
      "swift-wing": {
        id: "swift-wing",
        title: "Swift Wing Eagles",
        type: "faction",
        content: "Elite scouts.",
        connections: [{ target: "aranyver", type: "part_of", strength: 1 }],
      },
      aranyver: {
        id: "aranyver",
        title: "Aranyver",
        type: "faction",
        content:
          "The Aranyver are an ancient tribe of the deep forest, known for their mastery of spirit magic and their fierce defence of territorial boundaries.",
        connections: [],
      },
    });
    await executor.execute(
      {
        type: "guest-chat",
        query: "Tell me about the tribe.",
        entityId: "kardos",
      },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("WORLD KNOWLEDGE");
    expect(prompt).toContain("Second-level knowledge");
    expect(prompt).toContain("Aranyver");
    expect(prompt).toContain("ancient tribe");
    // Second-level note should tell the AI to express uncertainty
    expect(prompt).toContain("secondhand");
  });

  it("shows WORLD KNOWLEDGE with placeholder when connected entity has no public content", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      "char-1": makeCharacter({
        connections: [{ target: "faction-1", type: "member_of", strength: 1 }],
      }),
      "faction-1": {
        id: "faction-1",
        title: "Mystery Faction",
        type: "faction",
        content: "",
        connections: [],
      },
    });
    await executor.execute(
      { type: "guest-chat", query: "Hello.", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("WORLD KNOWLEDGE");
    expect(prompt).toContain("Mystery Faction");
    expect(prompt).toContain("no public summary");
  });

  // ─── lore scope ───────────────────────────────────────────────────────────────

  it("public scope: does not include private lore notes", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      "char-1": makeCharacter({
        lore: "## Personality & Voice\n- Deep voice.\n## Secrets\nHe is secretly a spy.",
        guestChatConfig: { isEnabled: true, contextScope: "public" },
      }),
    });
    await executor.execute(
      { type: "guest-chat", query: "Who are you?", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).not.toContain("secretly a spy");
  });

  it("hybrid scope: includes HIDDEN PRIVATE LORE block", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      "char-1": makeCharacter({
        lore: "## Personality & Voice\n- Deep voice.\n## Secrets\nHe is the heir to the throne.",
        guestChatConfig: { isEnabled: true, contextScope: "hybrid" },
      }),
    });
    await executor.execute(
      { type: "guest-chat", query: "Who are you?", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("HIDDEN PRIVATE LORE");
    expect(prompt).toContain("heir to the throne");
  });

  it("public scope: lore personality and knowledge sections appear; other lore does not", async () => {
    const executor = new GuestChatExecutor();
    const ctx = makeContext({
      "char-1": makeCharacter({
        content: "Mae keeps cattle near Briar Ford.",
        lore: `## Personality & Voice\n- Plain-spoken.\n\n## Knowledge & Expertise\n- Cattle, grazing land.\n\n## Secrets\nMae hides a royal brand in the barn.`,
        guestChatConfig: { isEnabled: true, contextScope: "public" },
      }),
    });
    await executor.execute(
      { type: "guest-chat", query: "What do you know?", entityId: "char-1" },
      ctx,
    );
    const prompt = systemPromptFrom(ctx);
    expect(prompt).toContain("Plain-spoken");
    expect(prompt).toContain("Cattle, grazing land");
    expect(prompt).not.toContain("royal brand");
  });
});
