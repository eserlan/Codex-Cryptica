import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleActionManager } from "../action-manager.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import type { IOracleStore } from "../types";

describe("OracleActionManager", () => {
  let manager: OracleActionManager;
  let mockStore: any;
  let mockExecutor: any;
  let mockUndoRedo: any;

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn(),
      drawEntity: vi.fn(),
      drawMessage: vi.fn(),
      prepareEntityPrompt: vi.fn().mockResolvedValue({ prompt: "prompt" }),
      prepareMessagePrompt: vi.fn().mockResolvedValue({ prompt: "prompt" }),
      generateEntityFromPrompt: vi.fn(),
      generateMessageFromPrompt: vi.fn(),
    };
    mockUndoRedo = {
      undo: vi.fn(),
      redo: vi.fn(),
      pushUndoAction: vi.fn(),
    };
    mockStore = {
      executor: mockExecutor,
      undoRedo: mockUndoRedo,
      getExecutionContext: vi.fn(),
      ui: { visualizingEntityId: null, visualizingMessageId: null },
      vault: {
        entities: { "entity-1": { title: "Entity One" } },
        updateEntity: vi.fn().mockResolvedValue(true),
      },
      notificationStore: {
        notify: vi.fn(),
      },
      reviseEntity: vi.fn().mockResolvedValue({
        content: "Revised chronicle",
        lore: "Revised lore",
      }),
      chatHistoryService: { messages: [{ id: "message-1", content: "Draw" }] },
    };
    modalUIStore.closeImagePromptReview();
    manager = new OracleActionManager(mockStore as IOracleStore);
  });

  it("should compose saved entity art direction rather than sending it raw", async () => {
    // Art Direction v2: saved art direction is a style override layer, so it
    // must still go through the composer to pick up subject, framing, camera,
    // and negatives.
    mockStore.vault.entities["entity-1"].artDirection = "saved prompt";

    await manager.drawEntity("entity-1");

    expect(mockExecutor.prepareEntityPrompt).toHaveBeenCalled();
    expect(modalUIStore.imagePromptReview).toMatchObject({
      open: true,
      target: { kind: "entity", id: "entity-1", title: "Entity One" },
    });
    expect(modalUIStore.imagePromptReview.prompt).not.toBe("saved prompt");
  });

  it("should execute undo", async () => {
    await manager.undo();
    expect(mockUndoRedo.undo).toHaveBeenCalled();
  });

  it("should execute redo", async () => {
    await manager.redo();
    expect(mockUndoRedo.redo).toHaveBeenCalled();
  });

  it("should push undo action", () => {
    const undo = async () => {};
    manager.pushUndoAction("test", undo);
    expect(mockUndoRedo.pushUndoAction).toHaveBeenCalledWith(
      "test",
      undo,
      undefined,
      undefined,
    );
  });

  it("should prepare an entity image prompt through the shared execution context", async () => {
    const context = { uiStore: { activeThemeId: "fantasy" } };
    mockStore.getExecutionContext.mockReturnValue(context);

    await manager.drawEntity("entity-1");

    expect(mockStore.ui.visualizingEntityId).toBeNull();
    expect(mockExecutor.prepareEntityPrompt).toHaveBeenCalledWith(
      "entity-1",
      context,
    );
    expect(modalUIStore.imagePromptReview).toMatchObject({
      open: true,
      prompt: "prompt",
      target: { kind: "entity", id: "entity-1", title: "Entity One" },
    });
  });

  it("should reuse a saved composed prompt without recomposing", async () => {
    mockStore.vault.entities["entity-1"].imageArtDirection = {
      artDirectionVersion: 2,
      prompt: "saved composed prompt",
      negativePrompt: "watermark, blurry",
      aspectRatio: "3:2",
    };

    await manager.drawEntity("entity-1");

    expect(mockExecutor.prepareEntityPrompt).not.toHaveBeenCalled();
    expect(modalUIStore.imagePromptReview).toMatchObject({
      open: true,
      prompt: "saved composed prompt",
      negativeTerms: ["watermark", "blurry"],
      aspectRatio: "3:2",
      target: { kind: "entity", id: "entity-1", title: "Entity One" },
    });
  });

  it("should recompose when no prompt was previously saved (e.g. never generated, or pre-Art Direction v2)", async () => {
    // Default mock entity has no imageArtDirection at all.
    await manager.drawEntity("entity-1");

    expect(mockExecutor.prepareEntityPrompt).toHaveBeenCalled();
  });

  it("should not start a duplicate entity draw while one is active", async () => {
    mockStore.ui.visualizingEntityId = "entity-1";

    await manager.drawEntity("entity-1");

    expect(mockExecutor.prepareEntityPrompt).not.toHaveBeenCalled();
  });

  it("should toast entity prompt preparation failures instead of throwing", async () => {
    mockExecutor.prepareEntityPrompt.mockRejectedValue(
      new Error("Generation quota reached."),
    );

    await expect(manager.drawEntity("entity-1")).resolves.toBeUndefined();

    expect(mockStore.notificationStore.notify).toHaveBeenCalledWith(
      "❌ Generation quota reached.",
      "error",
    );
    expect(mockStore.ui.visualizingEntityId).toBeNull();
    expect(modalUIStore.imagePromptReview.open).toBe(false);
  });

  it("should prepare a message image prompt through the shared execution context", async () => {
    const context = { uiStore: { activeThemeId: "cyberpunk" } };
    mockStore.getExecutionContext.mockReturnValue(context);

    await manager.drawMessage("message-1");

    expect(mockStore.ui.visualizingMessageId).toBeNull();
    expect(mockExecutor.prepareMessagePrompt).toHaveBeenCalledWith(
      "message-1",
      context,
    );
    expect(modalUIStore.imagePromptReview).toMatchObject({
      open: true,
      prompt: "prompt",
      target: { kind: "message", id: "message-1" },
    });
  });

  it("should compose linked entity art direction for message draws", async () => {
    mockStore.vault.entities["entity-1"].artDirection = "linked saved prompt";
    mockStore.chatHistoryService.messages = [
      { id: "message-1", content: "Draw", entityId: "entity-1" },
    ];

    await manager.drawMessage("message-1");

    expect(mockExecutor.prepareMessagePrompt).toHaveBeenCalled();
    expect(modalUIStore.imagePromptReview).toMatchObject({
      open: true,
      target: {
        kind: "message",
        id: "message-1",
        title: "Entity One",
        entityId: "entity-1",
      },
    });
    expect(modalUIStore.imagePromptReview.prompt).not.toBe(
      "linked saved prompt",
    );
  });

  it("should toast message prompt preparation failures instead of throwing", async () => {
    mockExecutor.prepareMessagePrompt.mockRejectedValue(
      new Error("Generation limit reached."),
    );

    await expect(manager.drawMessage("message-1")).resolves.toBeUndefined();

    expect(mockStore.notificationStore.notify).toHaveBeenCalledWith(
      "❌ Generation limit reached.",
      "error",
    );
    expect(mockStore.ui.visualizingMessageId).toBeNull();
    expect(modalUIStore.imagePromptReview.open).toBe(false);
  });

  it("should generate an entity image from an approved prompt", async () => {
    const context = { uiStore: { activeThemeId: "fantasy" } };
    mockStore.getExecutionContext.mockReturnValue(context);

    await manager.generateEntityFromPrompt("entity-1", "edited prompt", {
      negativeTerms: ["watermark"],
      aspectRatio: "2:3",
    });

    expect(mockStore.ui.visualizingEntityId).toBeNull();
    // The composed prompt is not written back to `artDirection`: it would
    // become a style override and duplicate the category and camera layers on
    // the next generation.
    expect(mockStore.vault.updateEntity).not.toHaveBeenCalled();
    // The negatives and the framing ride with the reviewed text: sending the
    // string alone dropped both on the path most images take.
    expect(mockExecutor.generateEntityFromPrompt).toHaveBeenCalledWith(
      "entity-1",
      {
        prompt: "edited prompt",
        negativeTerms: ["watermark"],
        aspectRatio: "2:3",
      },
      context,
    );
  });

  it("should not write an approved message prompt back to its entity", async () => {
    const context = { uiStore: { activeThemeId: "fantasy" } };
    mockStore.getExecutionContext.mockReturnValue(context);
    mockStore.chatHistoryService.messages = [
      { id: "message-1", content: "Draw", entityId: "entity-1" },
    ];

    await manager.generateMessageFromPrompt("message-1", "message prompt", {
      negativeTerms: ["watermark"],
    });

    // See above: composed prompts are provenance, not style direction.
    expect(mockStore.vault.updateEntity).not.toHaveBeenCalled();
    expect(mockExecutor.generateMessageFromPrompt).toHaveBeenCalledWith(
      "message-1",
      { prompt: "message prompt", negativeTerms: ["watermark"] },
      context,
    );
  });

  it("should toast entity image generation failures instead of throwing", async () => {
    mockExecutor.generateEntityFromPrompt.mockRejectedValue(
      new Error("Daily image generation limit exceeded."),
    );

    await expect(
      manager.generateEntityFromPrompt("entity-1", "edited prompt"),
    ).resolves.toBeUndefined();

    expect(mockStore.notificationStore.notify).toHaveBeenCalledWith(
      "❌ Daily image generation limit exceeded.",
      "error",
    );
    expect(mockStore.ui.visualizingEntityId).toBeNull();
  });

  it("should toast message image generation failures instead of throwing", async () => {
    mockExecutor.generateMessageFromPrompt.mockRejectedValue(
      new Error("Image generation failed."),
    );

    await expect(
      manager.generateMessageFromPrompt("message-1", "message prompt"),
    ).resolves.toBeUndefined();

    expect(mockStore.notificationStore.notify).toHaveBeenCalledWith(
      "❌ Image generation failed.",
      "error",
    );
    expect(mockStore.ui.visualizingMessageId).toBeNull();
  });

  it("should revise an entity prompt without opening the review modal", async () => {
    const context = { uiStore: { activeThemeId: "fantasy" } };
    mockStore.getExecutionContext.mockReturnValue(context);
    mockExecutor.prepareEntityPrompt.mockResolvedValue({
      prompt: "fresh prompt",
      negativeTerms: ["watermark"],
    });

    const result = await manager.regenerateEntityPrompt("entity-1");

    expect(result).toEqual({
      prompt: "fresh prompt",
      negativeTerms: ["watermark"],
    });
    expect(mockExecutor.prepareEntityPrompt).toHaveBeenCalledWith(
      "entity-1",
      context,
      { ignoreSavedArtDirection: true },
    );
    expect(modalUIStore.imagePromptReview.open).toBe(false);
  });

  it("should pass advanced art direction settings when revising", async () => {
    const context = { uiStore: { activeThemeId: "fantasy" } };
    mockStore.getExecutionContext.mockReturnValue(context);
    mockExecutor.prepareEntityPrompt.mockResolvedValue({
      prompt: "fresh prompt",
      negativeTerms: [],
    });

    await manager.regenerateEntityPrompt("entity-1", {
      cameraVariant: "portrait",
      styleReferenceMode: "name-free",
      stature: "divine",
    });

    expect(mockExecutor.prepareEntityPrompt).toHaveBeenCalledWith(
      "entity-1",
      context,
      {
        ignoreSavedArtDirection: true,
        cameraVariant: "portrait",
        styleReferenceMode: "name-free",
        stature: "divine",
      },
    );
  });

  it("should report the stature a revised prompt was composed at", async () => {
    // Stature is normally inferred from labels, so the caller has no other way
    // to know which one applied.
    mockStore.getExecutionContext.mockReturnValue({});
    mockExecutor.prepareEntityPrompt.mockResolvedValue({
      prompt: "fresh prompt",
      negativeTerms: [],
      metadata: { statureId: "divine" },
    });

    const result = await manager.regenerateEntityPrompt("entity-1");

    expect(result?.statureId).toBe("divine");
  });
});
