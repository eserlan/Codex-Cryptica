import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VisualizationExecutor } from "./visualization-executor";

const originalURL = globalThis.URL;

describe("VisualizationExecutor", () => {
  beforeEach(() => {
    (globalThis as any).URL = {
      createObjectURL: vi.fn(() => "blob-url"),
      revokeObjectURL: originalURL?.revokeObjectURL,
    } as any;
  });

  afterEach(() => {
    (globalThis as any).URL = originalURL;
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

  it("should prepare an entity prompt without generating an image", async () => {
    const generator = {
      prepareEntityVisualizationPrompt: vi
        .fn()
        .mockResolvedValue({ prompt: "final prompt" }),
      generateEntityVisualization: vi.fn(),
    };
    const executor = new VisualizationExecutor(generator as any);
    const context = {
      vault: {
        entities: { e1: { id: "e1", title: "Target" } },
      },
    } as any;

    const result = await executor.prepareEntityPrompt("e1", context);

    expect(result).toEqual({ prompt: "final prompt" });
    expect(generator.prepareEntityVisualizationPrompt).toHaveBeenCalledWith(
      "e1",
      context,
      {},
    );
    expect(generator.generateEntityVisualization).not.toHaveBeenCalled();
  });

  it("should skip entity prompt preparation when the entity is missing", async () => {
    const generator = {
      prepareEntityVisualizationPrompt: vi.fn(),
    };
    const executor = new VisualizationExecutor(generator as any);
    const context = {
      vault: {
        entities: {},
      },
    } as any;

    const result = await executor.prepareEntityPrompt("missing", context);

    expect(result).toBeNull();
    expect(generator.prepareEntityVisualizationPrompt).not.toHaveBeenCalled();
  });

  it("should generate an entity image from an approved prompt", async () => {
    const blob = new Blob([]);
    const generator = {
      generateVisualizationFromPrompt: vi.fn().mockResolvedValue(blob),
    };
    const executor = new VisualizationExecutor(generator as any);
    const saveImageToVault = vi
      .fn()
      .mockResolvedValue({ image: "path", thumbnail: "thumb" });
    const updateEntity = vi.fn();

    const context = {
      vault: {
        entities: { e1: { id: "e1", title: "Target" } },
        saveImageToVault,
        updateEntity,
      },
      chatHistory: { addMessage: vi.fn() },
      isDemoMode: false,
    } as any;

    await executor.generateEntityFromPrompt("e1", "edited prompt", context);

    expect(generator.generateVisualizationFromPrompt).toHaveBeenCalledWith(
      "edited prompt",
      context,
    );
    expect(saveImageToVault).toHaveBeenCalledWith(blob, "e1");
    expect(updateEntity).toHaveBeenCalledWith("e1", {
      image: "path",
      thumbnail: "thumb",
    });
  });
});
