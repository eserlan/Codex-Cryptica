import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import {
  nodeMergeService,
  type IMergedContentProposal,
} from "$lib/services/node-merge.service.svelte";
import { type RevisionDraft } from "@codex/oracle-engine";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { generatorSessionManager } from "$lib/services/generators/generator-session-manager";
import type { LocalEntity } from "$lib/stores/vault/types";

export type RevisionRequest = {
  entityId: string;
  instructions?: string;
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class RevisionService {
  pendingDraft = $state<RevisionDraft | null>(null);
  isRevising = $state(false);
  error = $state<string | null>(null);

  async revise(
    requestOrEntityId: RevisionRequest | string,
    legacyInstructions?: string,
  ): Promise<boolean> {
    if (this.isRevising) return false;

    const request = this.normalizeRevisionRequest(
      requestOrEntityId,
      legacyInstructions,
    );

    this.isRevising = true;
    this.error = null;
    this.pendingDraft = null;

    try {
      if (vault.isGuest) {
        throw new Error("Guest users cannot revise content.");
      }

      const revised = await oracle.reviseEntity({
        source: "revise",
        entityId: request.entityId,
        instructions: request.instructions,
        priority: "instructions-first",
      });

      if (!revised.content && !revised.lore) {
        throw new Error("AI failed to produce a valid description.");
      }

      this.pendingDraft = this.buildRevisionDraft(request.entityId, revised);
      return true;
    } catch (err: unknown) {
      this.error = errorMessage(err);
      console.error("[RevisionService] Failed to revise:", err);
      return false;
    } finally {
      this.isRevising = false;
    }
  }

  private normalizeRevisionRequest(
    requestOrEntityId: RevisionRequest | string,
    legacyInstructions?: string,
  ): RevisionRequest {
    if (typeof requestOrEntityId === "string") {
      return {
        entityId: requestOrEntityId,
        instructions: legacyInstructions,
      };
    }

    return requestOrEntityId;
  }

  private buildRevisionDraft(
    entityId: string,
    revised: { content?: string; lore?: string },
  ): RevisionDraft {
    const entity = vault.entities[entityId] as LocalEntity | undefined;
    return {
      entityId,
      source: "revise",
      chronicle: revised.content ?? entity?.content ?? "",
      lore: revised.lore ?? entity?.lore ?? "",
      timestamp: Date.now(),
    };
  }

  proposeMergeDraft(
    finalContent: IMergedContentProposal,
    sourceIds: string[],
    messageId?: string,
  ) {
    const entity = vault.entities[finalContent.targetId] as
      | LocalEntity
      | undefined;
    this.pendingDraft = {
      entityId: finalContent.targetId,
      messageId,
      source: "merge",
      chronicle: finalContent.suggestedBody,
      lore: finalContent.suggestedFrontmatter?.lore ?? entity?.lore ?? "",
      merge: {
        sourceIds,
        finalContent,
      },
      timestamp: Date.now(),
    };
    vault.selectedEntityId = finalContent.targetId;
  }

  async acceptDraft() {
    if (!this.pendingDraft) return;

    try {
      const draftSource = this.pendingDraft.source;
      const acceptedDraft = this.pendingDraft;
      if (this.pendingDraft.merge) {
        const finalContent = this.pendingDraft.merge
          .finalContent as IMergedContentProposal;
        await nodeMergeService.executeMerge(
          {
            ...finalContent,
            suggestedBody: this.pendingDraft.chronicle,
            suggestedFrontmatter: {
              ...finalContent.suggestedFrontmatter,
              lore: this.pendingDraft.lore,
            },
          },
          this.pendingDraft.merge.sourceIds,
        );
      } else {
        await vault.updateEntity(this.pendingDraft.entityId, {
          content: this.pendingDraft.chronicle,
          lore: this.pendingDraft.lore,
        });
      }
      if (acceptedDraft.generatorSessionCommit) {
        const entity = vault.entities[acceptedDraft.entityId] as
          | LocalEntity
          | undefined;
        generatorSessionManager.commitAcceptedEntity({
          id: acceptedDraft.entityId,
          title: entity?.title ?? acceptedDraft.entityId,
          type: entity?.type ?? "note",
          content: acceptedDraft.chronicle,
          lore: acceptedDraft.lore,
          labels: entity?.labels ?? [],
        });
      }
      if (this.pendingDraft) {
        this.pendingDraft.deleteOnDiscard = false;
        this.pendingDraft.generatorSessionCommit = false;
      }
      await this.discardDraft();
      notificationStore.notify(
        draftSource === "merge"
          ? "Merge saved successfully."
          : "AI content saved successfully.",
        "success",
      );
    } catch (err: unknown) {
      notificationStore.notify(
        `Failed to save draft: ${errorMessage(err)}`,
        "error",
      );
    }
  }

  async discardDraft() {
    const draft = this.pendingDraft;
    this.pendingDraft = null;
    if (draft?.generatorSessionCommit) {
      generatorSessionManager.reset();
    }
    if (draft?.deleteOnDiscard) {
      try {
        await vault.deleteEntity(draft.entityId);
      } catch {
        // Entity may already be gone; silently ignore.
      }
    }
  }
}

export const revisionService = new RevisionService();
export default revisionService;
