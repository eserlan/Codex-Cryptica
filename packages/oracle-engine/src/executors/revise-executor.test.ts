import { describe, it, expect, vi } from "vitest";
import { ReviseExecutor } from "./revise-executor";

describe("ReviseExecutor", () => {
  it("should revise entity content", async () => {
    const executor = new ReviseExecutor();
    const addMessage = vi.fn();
    const updateMessage = vi.fn();
    const setMessages = vi.fn();
    const emit = vi.fn();
    const reviseEntityUpdate = vi.fn().mockResolvedValue({
      content: "new chronicle",
      lore: "new lore",
    });

    const context = {
      vault: {
        entities: { e1: { id: "e1", title: "Target", connections: [] } },
        isGuest: false,
      },
      modelName: "model",
      effectiveApiKey: "key",
      textGeneration: { reviseEntityUpdate },
      categories: [],
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

    const intent = { type: "revise", entityId: "e1" } as any;

    await executor.execute(intent, context);

    expect(reviseEntityUpdate).toHaveBeenCalledWith(
      "key",
      "model",
      expect.objectContaining({ id: "e1" }),
      { chronicle: "", lore: "" },
      expect.any(Array),
      [],
      {
        source: "revise",
        instructions: undefined,
        priority: "instructions-first",
        isGuest: false,
      },
    );
    expect(updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      {
        content: "**Chronicle:** new chronicle\n\n**Lore:** new lore",
      },
      false,
    );
    expect(addMessage).toHaveBeenCalled();
    expect(setMessages).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should block revision for guests", async () => {
    const executor = new ReviseExecutor();
    const emit = vi.fn();
    const context = {
      vault: { isGuest: true, entities: { e1: {} } },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
    } as any;
    const intent = { type: "revise", entityId: "e1" } as any;

    await executor.execute(intent, context);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORACLE:COMMAND_FAILED",
        payload: expect.objectContaining({
          error: "Guest users cannot revise content.",
        }),
      }),
    );
  });

  it("should prevent concurrent execution", async () => {
    const executor = new ReviseExecutor();
    const addMessage = vi.fn();

    const context = {
      vault: { entities: { e1: {} }, isGuest: false },
      chatHistory: { addMessage, messages: [] },
      modelName: "model",
      textGeneration: {
        reviseEntityUpdate: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 50)),
          ),
      },
      categories: [],
      eventBus: { emit: vi.fn() },
    } as any;

    const p1 = executor.execute({ type: "revise", entityId: "e1" }, context);
    const p2 = executor.execute({ type: "revise", entityId: "e1" }, context);

    await Promise.all([p1, p2]);

    // Second call should have added a system message about already processing
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("already in progress"),
      }),
    );
  });
});
