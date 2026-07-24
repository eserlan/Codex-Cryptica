import { appEventBus } from "@codex/events";
import { ORACLE_EVENTS } from "@codex/oracle-engine";
import type {
  IOracleStore,
  PromptRegenerationOptions,
  RegeneratedPrompt,
} from "./types";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { systemClock } from "$lib/utils/runtime-deps";

export class OracleActionManager {
  constructor(private store: IOracleStore) {}

  get undoStack() {
    return this.store.undoRedo?.undoStack ?? [];
  }

  get redoStack() {
    return this.store.undoRedo?.redoStack ?? [];
  }

  async undo() {
    await this.store.undoRedo.undo((action: any) => {
      if (action?.messageId) {
        appEventBus.emit({
          type: ORACLE_EVENTS.UNDO_PERFORMED,
          domain: "oracle",
          payload: { messageId: action.messageId },
          metadata: { timestamp: systemClock.now(), sync: true },
        });
      }
    });
  }

  async redo() {
    await this.store.undoRedo.redo();
  }

  async drawEntity(entityId: string) {
    if (this.store.ui.visualizingEntityId === entityId) return;

    this.store.ui.visualizingEntityId = entityId;
    try {
      const entity = this.store.vault.entities[entityId];
      if (!entity) return;

      // Saved art direction no longer short-circuits composition. Under Art
      // Direction v2 it is a style override layer, so it must go through the
      // composer to pick up the subject, category framing, camera, and
      // negatives rather than being sent to the provider on its own.
      const result = await this.store.executor.prepareEntityPrompt(
        entityId,
        this.store.getExecutionContext(),
      );
      if (result) {
        modalUIStore.openImagePromptReview(
          { kind: "entity", id: entityId, title: entity.title },
          result.prompt,
          result.negativeTerms,
        );
      }
    } catch (err) {
      this.notifyImageGenerationFailure(err);
    } finally {
      if (this.store.ui.visualizingEntityId === entityId) {
        this.store.ui.visualizingEntityId = null;
      }
    }
  }

  async drawMessage(messageId: string) {
    if (this.store.ui.visualizingMessageId === messageId) return;

    this.store.ui.visualizingMessageId = messageId;
    try {
      const message = this.store.chatHistoryService.messages.find(
        (m: any) => m.id === messageId,
      );
      const linkedEntity = message?.entityId
        ? this.store.vault.entities[message.entityId]
        : null;
      // See drawEntity: saved art direction is composed, never sent raw.
      const result = await this.store.executor.prepareMessagePrompt(
        messageId,
        this.store.getExecutionContext(),
      );
      if (result && message) {
        modalUIStore.openImagePromptReview(
          {
            kind: "message",
            id: messageId,
            title: linkedEntity?.title || "Oracle image",
            entityId: message.entityId,
          },
          result.prompt,
          result.negativeTerms,
        );
      }
    } catch (err) {
      this.notifyImageGenerationFailure(err);
    } finally {
      if (this.store.ui.visualizingMessageId === messageId) {
        this.store.ui.visualizingMessageId = null;
      }
    }
  }

  async generateEntityFromPrompt(entityId: string, prompt: string) {
    if (this.store.ui.visualizingEntityId === entityId) return;

    this.store.ui.visualizingEntityId = entityId;
    try {
      // The composed prompt is not written back to `artDirection`: that field
      // is user-authored style direction and now overrides the theme layer, so
      // storing a full prompt there would duplicate the category and camera
      // layers on the next generation. Provenance is kept in
      // `imageArtDirection` when the image is saved.
      await this.store.executor.generateEntityFromPrompt(
        entityId,
        prompt,
        this.store.getExecutionContext(),
      );
    } catch (err) {
      this.notifyImageGenerationFailure(err);
    } finally {
      if (this.store.ui.visualizingEntityId === entityId) {
        this.store.ui.visualizingEntityId = null;
      }
    }
  }

  async generateMessageFromPrompt(messageId: string, prompt: string) {
    if (this.store.ui.visualizingMessageId === messageId) return;

    this.store.ui.visualizingMessageId = messageId;
    try {
      // See generateEntityFromPrompt: composed prompts are not written back
      // to `artDirection`.
      await this.store.executor.generateMessageFromPrompt(
        messageId,
        prompt,
        this.store.getExecutionContext(),
      );
    } catch (err) {
      this.notifyImageGenerationFailure(err);
    } finally {
      if (this.store.ui.visualizingMessageId === messageId) {
        this.store.ui.visualizingMessageId = null;
      }
    }
  }

  async regenerateEntityPrompt(
    entityId: string,
    options: PromptRegenerationOptions = {},
  ): Promise<RegeneratedPrompt | null> {
    const result = await this.store.executor.prepareEntityPrompt(
      entityId,
      this.store.getExecutionContext(),
      { ignoreSavedArtDirection: true, ...options },
    );
    return result
      ? { prompt: result.prompt, negativeTerms: result.negativeTerms }
      : null;
  }

  async regenerateMessagePrompt(
    messageId: string,
    options: PromptRegenerationOptions = {},
  ): Promise<RegeneratedPrompt | null> {
    const result = await this.store.executor.prepareMessagePrompt(
      messageId,
      this.store.getExecutionContext(),
      options,
    );
    return result
      ? { prompt: result.prompt, negativeTerms: result.negativeTerms }
      : null;
  }

  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ) {
    this.store.undoRedo.pushUndoAction(description, undo, messageId, redo);
  }

  private notifyImageGenerationFailure(err: unknown) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Image generation failed. Please try again.";
    this.store.notificationStore.notify(
      message.startsWith("❌") ? message : `❌ ${message}`,
      "error",
    );
  }
}
