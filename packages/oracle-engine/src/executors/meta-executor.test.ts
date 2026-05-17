import { describe, it, expect, vi } from "vitest";
import { MetaExecutor } from "./meta-executor";

describe("MetaExecutor", () => {
  it("should show help message", async () => {
    const executor = new MetaExecutor();
    const addMessage = vi.fn();
    const emit = vi.fn();
    const context = {
      uiStore: { aiDisabled: false },
      chatHistory: { addMessage },
      eventBus: { emit },
    } as any;
    const intent = { type: "help" } as any;

    await executor.execute(intent, context);

    expect(addMessage).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_STARTED" }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should show restricted help message when AI is disabled", async () => {
    const executor = new MetaExecutor();
    const addMessage = vi.fn();
    const context = {
      uiStore: { aiDisabled: true },
      chatHistory: { addMessage },
    } as any;
    const intent = { type: "help" } as any;

    await executor.execute(intent, context);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("### Restricted Mode Active"),
      }),
    );
  });

  it("should clear chat history", async () => {
    const executor = new MetaExecutor();
    const clearMessages = vi.fn();
    const context = { chatHistory: { clearMessages } } as any;
    const intent = { type: "clear" } as any;

    await executor.execute(intent, context);

    expect(clearMessages).toHaveBeenCalled();
  });
});
