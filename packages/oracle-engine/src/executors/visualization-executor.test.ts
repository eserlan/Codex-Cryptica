import { describe, it, expect, vi, beforeEach } from "vitest";
import { VisualizationExecutor } from "./visualization-executor";

describe("VisualizationExecutor", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob-url") });
  });

  it("should draw an entity in demo mode", async () => {
    const generator = {
      generateEntityVisualization: vi.fn().mockResolvedValue(new Blob([])),
    };
    const executor = new VisualizationExecutor(generator as any);
    const addMessage = vi.fn();
    const emit = vi.fn();

    const context = {
      vault: {
        entities: { e1: { id: "e1", title: "Target" } },
      },
      chatHistory: { addMessage },
      eventBus: { emit },
      isDemoMode: true,
    } as any;

    const intent = { type: "draw", entityId: "e1" } as any;

    await executor.execute(intent, context);

    expect(generator.generateEntityVisualization).toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image", imageUrl: "blob-url" }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should draw an entity and save to vault in non-demo mode", async () => {
    const generator = {
      generateEntityVisualization: vi.fn().mockResolvedValue(new Blob([])),
    };
    const executor = new VisualizationExecutor(generator as any);
    const saveImageToVault = vi
      .fn()
      .mockResolvedValue({ image: "path", thumbnail: "thumb" });
    const updateEntity = vi.fn();
    const emit = vi.fn();

    const context = {
      vault: {
        entities: { e1: { id: "e1", title: "Target" } },
        saveImageToVault,
        updateEntity,
      },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
      isDemoMode: false,
    } as any;

    const intent = { type: "draw", entityId: "e1" } as any;

    await executor.execute(intent, context);

    expect(saveImageToVault).toHaveBeenCalled();
    expect(updateEntity).toHaveBeenCalledWith("e1", {
      image: "path",
      thumbnail: "thumb",
    });
  });

  it("should draw a message", async () => {
    const generator = {
      generateMessageVisualization: vi.fn().mockResolvedValue(new Blob([])),
    };
    const executor = new VisualizationExecutor(generator as any);
    const setMessages = vi.fn();

    const context = {
      chatHistory: {
        messages: [{ id: "m1", content: "hello" }],
        setMessages,
      },
    } as any;

    await executor.drawMessage("m1", context);

    expect(generator.generateMessageVisualization).toHaveBeenCalled();
    expect(setMessages).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ type: "image" })]),
    );
  });
});
