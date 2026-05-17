import { describe, it, expect, vi } from "vitest";
import { DiceExecutor } from "./dice-executor";

describe("DiceExecutor", () => {
  it("should execute a valid roll formula", async () => {
    const executor = new DiceExecutor();
    const addMessage = vi.fn();
    const addResult = vi.fn();
    const parse = vi.fn().mockReturnValue("parsed-command");
    const execute = vi.fn().mockReturnValue({ total: 10 });

    const emit = vi.fn();
    const context = {
      chatHistory: { addMessage },
      diceParser: { parse },
      diceEngine: { execute },
      diceHistory: { addResult },
      eventBus: { emit },
    } as any;

    const intent = { type: "roll", formula: "1d20" } as any;

    await executor.execute(intent, context);

    expect(parse).toHaveBeenCalledWith("1d20");
    expect(execute).toHaveBeenCalledWith("parsed-command");
    expect(addResult).toHaveBeenCalledWith({ total: 10 }, "chat");
    expect(addMessage).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_STARTED" }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should show error for missing formula", async () => {
    const executor = new DiceExecutor();
    const addMessage = vi.fn();
    const context = { chatHistory: { addMessage } } as any;
    const intent = { type: "roll" } as any;

    await executor.execute(intent, context);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("specify a roll formula"),
      }),
    );
  });

  it("should handle roll failures", async () => {
    const executor = new DiceExecutor();
    const addMessage = vi.fn();
    const parse = vi.fn().mockImplementation(() => {
      throw new Error("Parse error");
    });
    const context = {
      chatHistory: { addMessage },
      diceParser: { parse },
    } as any;
    const intent = { type: "roll", formula: "invalid" } as any;

    await executor.execute(intent, context);

    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Roll failed: Parse error"),
      }),
    );
  });
});
