import { describe, it, expect, vi } from "vitest";
import { MergeExecutor } from "./merge-executor";

describe("MergeExecutor", () => {
  it("should merge two entities", async () => {
    const executor = new MergeExecutor();
    const search = vi
      .fn()
      .mockResolvedValueOnce([{ id: "source-id" }])
      .mockResolvedValueOnce([{ id: "target-id" }]);
    const proposeMerge = vi.fn().mockResolvedValue({ id: "proposal-id" });
    const executeMerge = vi.fn().mockResolvedValue(true);
    const addMessage = vi.fn();
    const emit = vi.fn();

    const context = {
      searchService: { search },
      vault: {
        entities: {
          "source-id": { id: "source-id", title: "Source", type: "person" },
          "target-id": { id: "target-id", title: "Target", type: "person" },
        },
      },
      nodeMergeService: { proposeMerge, executeMerge },
      chatHistory: { addMessage },
      eventBus: { emit },
      undoRedo: { pushUndoAction: vi.fn() },
    } as any;

    const intent = {
      type: "merge",
      sourceName: "Source",
      targetName: "Target",
    } as any;

    await executor.execute(intent, context);

    expect(search).toHaveBeenCalledTimes(2);
    expect(proposeMerge).toHaveBeenCalled();
    expect(executeMerge).toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Merged **Source** into **Target**."),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should prevent merging an entity into itself", async () => {
    const executor = new MergeExecutor();
    const search = vi.fn().mockResolvedValue([{ id: "same-id" }]);
    const emit = vi.fn();
    const context = {
      searchService: { search },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
    } as any;
    const intent = { type: "merge", sourceName: "A", targetName: "A" } as any;

    await executor.execute(intent, context);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORACLE:COMMAND_FAILED",
        payload: expect.objectContaining({
          error: "Cannot merge an entity into itself.",
        }),
      }),
    );
  });
});
