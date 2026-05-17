import { describe, it, expect, vi } from "vitest";
import { RegenerateExecutor } from "./regenerate-executor";

describe("RegenerateExecutor", () => {
  it("should regenerate entity content", async () => {
    const generator = {
      generateRegenerationResponse: vi
        .fn()
        .mockImplementation((id, ctx, onPartial) => {
          onPartial("new content");
          return Promise.resolve();
        }),
    };
    const executor = new RegenerateExecutor(generator as any);
    const addMessage = vi.fn();
    const updateMessage = vi.fn();
    const setMessages = vi.fn();
    const emit = vi.fn();

    const context = {
      vault: {
        entities: { e1: { id: "e1", title: "Target" } },
        isGuest: false,
      },
      chatHistory: {
        messages: [],
        addMessage,
        updateMessage,
        setMessages,
        getMessages: vi
          .fn()
          .mockResolvedValue([
            { id: "assistant-id", role: "assistant", content: "new content" },
          ]),
      },
      eventBus: { emit },
    } as any;

    const intent = { type: "regenerate", entityId: "e1" } as any;

    await executor.execute(intent, context);

    expect(generator.generateRegenerationResponse).toHaveBeenCalledWith(
      "e1",
      context,
      expect.any(Function),
    );
    expect(addMessage).toHaveBeenCalled();
    expect(setMessages).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should block regeneration for guests", async () => {
    const executor = new RegenerateExecutor();
    const emit = vi.fn();
    const context = {
      vault: { isGuest: true, entities: { e1: {} } },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
    } as any;
    const intent = { type: "regenerate", entityId: "e1" } as any;

    await executor.execute(intent, context);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORACLE:COMMAND_FAILED",
        payload: expect.objectContaining({
          error: "Guest users cannot regenerate content.",
        }),
      }),
    );
  });

  it("should prevent concurrent execution", async () => {
    const generator = {
      generateRegenerationResponse: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50)),
        ),
    };
    const executor = new RegenerateExecutor(generator as any);
    const addMessage = vi.fn();

    const context = {
      vault: { entities: { e1: {} }, isGuest: false },
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit: vi.fn() },
    } as any;

    const p1 = executor.execute(
      { type: "regenerate", entityId: "e1" },
      context,
    );
    const p2 = executor.execute(
      { type: "regenerate", entityId: "e1" },
      context,
    );

    await Promise.all([p1, p2]);

    // Second call should have added a system message about already processing
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("already in progress"),
      }),
    );
  });
});
