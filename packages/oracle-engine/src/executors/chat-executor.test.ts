import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatExecutor } from "./chat-executor";

const originalNavigator = globalThis.navigator;
const originalURL = globalThis.URL;

describe("ChatExecutor", () => {
  beforeEach(() => {
    (globalThis as any).navigator = { onLine: true } as any;
    (globalThis as any).URL = {
      createObjectURL: vi.fn(() => "url"),
      revokeObjectURL: originalURL?.revokeObjectURL,
    } as any;
  });

  afterEach(() => {
    (globalThis as any).navigator = originalNavigator;
    (globalThis as any).URL = originalURL;
  });

  it("should handle simple chat queries", async () => {
    const generator = {
      generateChatResponse: vi
        .fn()
        .mockResolvedValue({ primaryEntityId: "e1", sourceIds: [] }),
    };
    const executor = new ChatExecutor(generator as any);
    const addMessage = vi.fn();
    const emit = vi.fn();

    const context = {
      chatHistory: {
        messages: [],
        addMessage,
        setMessages: vi.fn(),
      },
      eventBus: { emit },
      uiStore: { entityDiscoveryMode: "off" },
    } as any;

    const intent = { type: "chat", query: "hello" } as any;

    await executor.execute(intent, context);

    expect(generator.generateChatResponse).toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user" }),
    );
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant" }),
    );

    // Check specific calls in order
    expect(emit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "ORACLE:COMMAND_STARTED" }),
    );
    expect(emit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should prevent concurrent execution", async () => {
    let startGeneration: () => void;
    const generationStarted = new Promise<void>((resolve) => {
      startGeneration = resolve;
    });
    let completeGeneration: (value: {
      primaryEntityId: string;
      sourceIds: string[];
    }) => void;
    const generation = new Promise<{
      primaryEntityId: string;
      sourceIds: string[];
    }>((resolve) => {
      completeGeneration = resolve;
    });
    const generator = {
      generateChatResponse: vi.fn().mockImplementation(() => {
        startGeneration();
        return generation;
      }),
    };
    const executor = new ChatExecutor(generator as any);
    const addMessage = vi.fn();

    const context = {
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
    } as any;

    const p1 = executor.execute({ type: "chat", query: "q1" }, context);
    const p2 = executor.execute({ type: "chat", query: "q2" }, context);

    await Promise.all([p2, generationStarted]);
    completeGeneration({ primaryEntityId: "e1", sourceIds: [] });
    await p1;

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("already processing a request"),
      }),
    );
  });

  it("should handle offline mode", async () => {
    (globalThis as any).navigator = { onLine: false } as any;
    const executor = new ChatExecutor();
    const addMessage = vi.fn();

    const context = {
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
    } as any;

    await executor.execute({ type: "chat", query: "hi" }, context);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Oracle is currently offline"),
      }),
    );
  });
});
