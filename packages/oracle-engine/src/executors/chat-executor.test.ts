import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatExecutor } from "./chat-executor";

describe("ChatExecutor", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "url") });
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
    const generator = {
      generateChatResponse: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50)),
        ),
    };
    const executor = new ChatExecutor(generator as any);
    const addMessage = vi.fn();

    const context = {
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
    } as any;

    const p1 = executor.execute({ type: "chat", query: "q1" }, context);
    const p2 = executor.execute({ type: "chat", query: "q2" }, context);

    await Promise.all([p1, p2]);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("already processing a request"),
      }),
    );
  });

  it("should handle offline mode", async () => {
    vi.stubGlobal("navigator", { onLine: false });
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
