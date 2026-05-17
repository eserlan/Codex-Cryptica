import { describe, it, expect, vi } from "vitest";
import { ConnectExecutor } from "./connect-executor";

describe("ConnectExecutor", () => {
  it("should connect two entities", async () => {
    const executor = new ConnectExecutor();
    const search = vi
      .fn()
      .mockResolvedValueOnce([{ id: "source-id" }])
      .mockResolvedValueOnce([{ id: "target-id" }]);
    const addConnection = vi.fn().mockResolvedValue(true);
    const addMessage = vi.fn();
    const emit = vi.fn();

    const context = {
      searchService: { search },
      vault: {
        entities: {
          "source-id": { id: "source-id", title: "Source" },
          "target-id": { id: "target-id", title: "Target" },
        },
        addConnection,
      },
      chatHistory: { addMessage },
      eventBus: { emit },
      undoRedo: { pushUndoAction: vi.fn() },
    } as any;

    const intent = {
      type: "connect",
      sourceName: "Source",
      targetName: "Target",
      label: "friend",
    } as any;

    await executor.execute(intent, context);

    expect(search).toHaveBeenCalledTimes(2);
    expect(addConnection).toHaveBeenCalledWith(
      "source-id",
      "target-id",
      "related_to",
      "friend",
    );
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining(
          "Connected **Source** to **Target** as *friend*.",
        ),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should handle entity not found", async () => {
    const executor = new ConnectExecutor();
    const search = vi.fn().mockResolvedValue([]);
    const emit = vi.fn();
    const context = {
      searchService: { search },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
    } as any;
    const intent = {
      type: "connect",
      sourceName: "Missing",
      targetName: "Target",
    } as any;

    await executor.execute(intent, context);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORACLE:COMMAND_FAILED",
        payload: expect.objectContaining({
          error: expect.stringContaining(
            'Could not find source entity: "Missing"',
          ),
        }),
      }),
    );
  });
});
