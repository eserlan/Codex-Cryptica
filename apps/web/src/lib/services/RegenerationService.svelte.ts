import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { uiStore } from "$lib/stores/ui.svelte";
import {
  nodeMergeService,
  type IMergedContentProposal,
} from "$lib/services/node-merge.service";
import {
  OracleCommandParser,
  type RegenerationDraft,
} from "@codex/oracle-engine";

export class RegenerationService {
  pendingDraft = $state<RegenerationDraft | null>(null);
  isGenerating = $state(false);
  error = $state<string | null>(null);

  async regenerate(entityId: string): Promise<boolean> {
    if (this.isGenerating) return false;

    this.isGenerating = true;
    this.error = null;
    this.pendingDraft = null;

    try {
      let fullText = "";
      await oracle.regenerate(entityId, (partial) => {
        fullText = partial;
      });

      const parsed = OracleCommandParser.parseRegenerationResponse(fullText);

      if (!parsed.chronicle && !parsed.lore) {
        throw new Error("AI failed to produce a valid description.");
      }

      // Reconcile the AI output with existing content to preserve/merge details
      let updates: { content?: string; lore?: string } = {};
      try {
        updates = await oracle.reconcileSmartApply(entityId, {
          chronicle: parsed.chronicle,
          lore: parsed.lore,
        });
      } catch (e) {
        console.error(
          "[RegenerationService] Reconciliation failed, falling back to raw output",
          e,
        );
      }

      const entity = vault.entities[entityId] as any;
      this.pendingDraft = {
        entityId,
        source: "regenerate",
        chronicle: updates.content ?? parsed.chronicle ?? entity?.content ?? "",
        lore: updates.lore ?? parsed.lore ?? entity?.lore ?? "",
        timestamp: Date.now(),
      };
      return true;
    } catch (err: any) {
      this.error = err.message;
      console.error("[RegenerationService] Failed to regenerate:", err);
      return false;
    } finally {
      this.isGenerating = false;
    }
  }

  proposeMergeDraft(
    finalContent: IMergedContentProposal,
    sourceIds: string[],
    messageId?: string,
  ) {
    const entity = vault.entities[finalContent.targetId] as any;
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
      this.discardDraft();
      uiStore.notify(
        draftSource === "merge"
          ? "Merge saved successfully."
          : "AI content saved successfully.",
        "success",
      );
    } catch (err: any) {
      uiStore.notify(`Failed to save draft: ${err.message}`, "error");
    }
  }

  discardDraft() {
    this.pendingDraft = null;
  }
}

export const regenerationService = new RegenerationService();
export default regenerationService;
