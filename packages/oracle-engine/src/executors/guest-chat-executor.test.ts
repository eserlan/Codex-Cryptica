import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GuestChatExecutor } from "./guest-chat-executor";

const originalNavigator = globalThis.navigator;

describe("GuestChatExecutor", () => {
  beforeEach(() => {
    (globalThis as any).navigator = { onLine: true } as any;
  });

  afterEach(() => {
    (globalThis as any).navigator = originalNavigator;
  });

  it("should handle offline mode", async () => {
    (globalThis as any).navigator = { onLine: false } as any;
    const executor = new GuestChatExecutor();
    const addMessage = vi.fn();

    const context = {
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
    } as any;

    await executor.execute(
      { type: "guest-chat", query: "hello", entityId: "char-1" },
      context,
    );

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "system",
        content: expect.stringContaining("offline"),
      }),
    );
  });

  it("should reject if character is not found or has guest chat disabled", async () => {
    const executor = new GuestChatExecutor();
    const addMessage = vi.fn();

    const context = {
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
      vault: {
        entities: {
          "char-1": {
            id: "char-1",
            type: "character",
            guestChatConfig: { isEnabled: false },
          },
        },
      },
    } as any;

    await executor.execute(
      { type: "guest-chat", query: "hello", entityId: "char-1" },
      context,
    );

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "system",
        content: expect.stringContaining("no longer available"),
      }),
    );
  });

  it("should build prompt with public lore scope", async () => {
    const executor = new GuestChatExecutor();
    const addMessage = vi.fn();
    const generateResponse = vi.fn().mockResolvedValue(undefined);

    const context = {
      chatHistory: {
        addMessage,
        updateMessage: vi.fn(),
        getMessages: vi.fn().mockResolvedValue([]),
        setMessages: vi.fn(),
        messages: [],
      },
      eventBus: { emit: vi.fn() },
      vault: {
        entities: {
          "char-1": {
            id: "char-1",
            title: "Blacksmith Joe",
            type: "character",
            content: "Joe works at the forge.",
            lore: "Joe is secretly the heir to the throne.",
            guestChatConfig: {
              isEnabled: true,
              contextScope: "public",
              extraInstructions: "Speaks with a deep voice.",
            },
          },
        },
      },
      effectiveApiKey: "mock-key",
      modelName: "mock-model",
      textGeneration: {
        generateResponse,
      },
    } as any;

    await executor.execute(
      { type: "guest-chat", query: "Who are you?", entityId: "char-1" },
      context,
    );

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        content: "Who are you?",
      }),
    );
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "assistant",
      }),
    );

    expect(generateResponse).toHaveBeenCalledWith(
      "mock-key",
      "Who are you?",
      [],
      "",
      "mock-model",
      expect.any(Function),
      undefined,
      [],
      expect.objectContaining({
        systemInstructionOverride: expect.stringContaining(
          'roleplaying as the NPC "Blacksmith Joe"',
        ),
      }),
    );

    const systemPrompt = generateResponse.mock.calls[0][8]
      .systemInstructionOverride as string;
    expect(systemPrompt).toContain("Joe works at the forge.");
    expect(systemPrompt).toContain("Speaks with a deep voice.");
    // Should NOT contain the private notes in public mode
    expect(systemPrompt).not.toContain("secretly the heir to the throne");
  });

  it("should build prompt with hybrid lore scope (including hidden reasoning)", async () => {
    const executor = new GuestChatExecutor();
    const addMessage = vi.fn();
    const generateResponse = vi.fn().mockResolvedValue(undefined);

    const context = {
      chatHistory: {
        addMessage,
        updateMessage: vi.fn(),
        getMessages: vi.fn().mockResolvedValue([]),
        setMessages: vi.fn(),
        messages: [],
      },
      eventBus: { emit: vi.fn() },
      vault: {
        entities: {
          "char-1": {
            id: "char-1",
            title: "Blacksmith Joe",
            type: "character",
            content: "Joe works at the forge.",
            lore: "Joe is secretly the heir to the throne.",
            guestChatConfig: {
              isEnabled: true,
              contextScope: "hybrid",
              extraInstructions: "Speaks with a deep voice.",
            },
          },
        },
      },
      effectiveApiKey: "mock-key",
      modelName: "mock-model",
      textGeneration: {
        generateResponse,
      },
    } as any;

    await executor.execute(
      { type: "guest-chat", query: "Who are you?", entityId: "char-1" },
      context,
    );

    const systemPrompt = generateResponse.mock.calls[0][8]
      .systemInstructionOverride as string;
    expect(systemPrompt).toContain("Joe works at the forge.");
    expect(systemPrompt).toContain("Speaks with a deep voice.");
    // SHOULD contain the private notes inside HIDDEN REASONING
    expect(systemPrompt).toContain("HIDDEN REASONING");
    expect(systemPrompt).toContain("secretly the heir to the throne");
  });
});
