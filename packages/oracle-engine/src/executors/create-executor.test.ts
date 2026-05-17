import { describe, it, expect, vi } from "vitest";
import { CreateExecutor } from "./create-executor";

describe("CreateExecutor", () => {
  it("should create an entity and emit events", async () => {
    const executor = new CreateExecutor();
    const createEntity = vi.fn().mockResolvedValue("new-id");
    const addMessage = vi.fn();
    const emit = vi.fn();
    const proposeConnectionsForEntity = vi.fn().mockResolvedValue(2);

    const context = {
      vault: { createEntity, isGuest: false },
      chatHistory: { addMessage, messages: [] },
      eventBus: { emit },
      proposeConnectionsForEntity,
      automationPolicy: { connectionDiscovery: "auto-apply" },
    } as any;

    const intent = {
      type: "create",
      entityName: "Test Node",
      entityType: "person",
    } as any;

    await executor.execute(intent, context);

    expect(createEntity).toHaveBeenCalledWith("person", "Test Node", {
      content: "",
      lore: "",
    });
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:ENTITY_CREATED" }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining(
          "Created node: **Test Node** (PERSON) and added 2 connections",
        ),
      }),
    );
  });

  it("should block creation for guest users", async () => {
    const executor = new CreateExecutor();
    const emit = vi.fn();
    const context = {
      vault: { isGuest: true },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
    } as any;
    const intent = { type: "create", entityName: "Guest Node" } as any;

    await executor.execute(intent, context);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORACLE:COMMAND_FAILED",
        payload: expect.objectContaining({
          error: "Guest users cannot create nodes.",
        }),
      }),
    );
  });
});
