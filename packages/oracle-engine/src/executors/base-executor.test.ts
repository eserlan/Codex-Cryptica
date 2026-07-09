import { describe, it, expect, vi } from "vitest";
import { BaseExecutor } from "./base-executor";
import type { OracleExecutionContext, OracleIntent } from "../types";
import type { Clock, IdGenerator } from "../runtime";

class TestExecutor extends BaseExecutor {
  constructor(clock?: Clock, idGenerator?: IdGenerator) {
    super(clock, idGenerator);
  }

  async execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    logic: () => Promise<void>,
  ) {
    await this.executeWithStack(intent, context, logic);
  }

  public testGetCategories(context: OracleExecutionContext) {
    return this.getAvailableCategories(context);
  }

  public testEmit(context: OracleExecutionContext, event: any) {
    return this.emit(context, event);
  }
}

describe("BaseExecutor", () => {
  it("should normalize categories", () => {
    const executor = new TestExecutor();
    const context = {
      categories: [
        { id: " cat1 ", label: "Category 1" },
        { id: "cat2" },
        { id: "" },
        null,
      ],
    } as any;

    const result = executor.testGetCategories(context);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "cat1",
      label: "Category 1",
      description: undefined,
    });
    expect(result[1]).toEqual({
      id: "cat2",
      label: undefined,
      description: undefined,
    });
  });

  it("should prevent circular commands using executeWithStack", async () => {
    const executor = new TestExecutor();
    const context = { commandStack: [] } as any;
    const intent = { type: "create", entityName: "Test" } as any;

    await executor.execute(intent, context, async () => {
      expect(context.commandStack).toContain("create:Test");

      // Attempt circular call
      await expect(
        executor.execute(intent, context, async () => {}),
      ).rejects.toThrow("Circular command detected: create");
    });

    expect(context.commandStack).toHaveLength(0);
  });

  it("should emit events via eventBus with domain and metadata", async () => {
    const mockClock = { now: () => 12345 };
    const executor = new TestExecutor(mockClock);
    const emit = vi.fn();
    const context = { eventBus: { emit }, vaultId: "v1" } as any;
    const event = { type: "TEST_EVENT" };

    await executor.testEmit(context, event);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TEST_EVENT",
        domain: "oracle",
        metadata: {
          vaultId: "v1",
          timestamp: 12345,
        },
      }),
    );
  });
});
