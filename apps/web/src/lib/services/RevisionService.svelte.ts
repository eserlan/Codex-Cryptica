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
import { systemClock, type Clock } from "$lib/utils/runtime-deps";
import { buildLoreMergePlan } from "$lib/utils/lore-sections";
import { loreMergeStore } from "$lib/stores/ui/lore-merge.svelte";

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

  constructor(private clock: Clock = systemClock) {}

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
      notificationStore.notify(this.error, "error");
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

  /**
   * The patch an accepted draft writes.
   *
   * `updateEntity` only preserves an existing value when the field is
   * `undefined` — an empty string is a real write, and overwrites. Accepting a
   * draft must never be able to erase content the user wrote, so a field that
   * came back empty is omitted from the patch entirely rather than sent as "".
   *
   * This is deliberately not enforced inside `updateEntity`: clearing a field
   * by hand in the editor is legitimate, and must keep working. The rule
   * belongs to this path, where an empty value means "the AI did not produce
   * one" rather than "the user deleted it" (#2584).
   */
  private buildAcceptPatch(draft: {
    entityId: string;
    chronicle: string;
    lore: string;
  }): { content?: string; lore?: string } {
    const entity = vault.entities[draft.entityId] as LocalEntity | undefined;
    const patch: { content?: string; lore?: string } = {};

    if (draft.chronicle || !entity?.content) patch.content = draft.chronicle;
    if (draft.lore || !entity?.lore) patch.lore = draft.lore;

    return patch;
  }

  private buildRevisionDraft(
    entityId: string,
    revised: { content?: string; lore?: string },
  ): RevisionDraft {
    const entity = vault.entities[entityId] as LocalEntity | undefined;
    // `||` rather than `??` on purpose: an AI response can come back with an
    // empty *string* for a field it chose not to rewrite, and `??` would let
    // that through. Accepting the draft writes these values straight over the
    // entity, so an empty string here erases whatever the user had written
    // (#2584). Falling back to the existing value means a field the AI did not
    // touch is left as it was.
    return {
      entityId,
      source: "revise",
      chronicle: revised.content || entity?.content || "",
      lore: revised.lore || entity?.lore || "",
      timestamp: this.clock.now(),
    };
  }

  proposeMergeDraft(
    finalContent: IMergedContentProposal,
    sourceIds: string[],
    messageId?: string,
  ) {
    const entity = vault.entities[finalContent.targetId] as
      LocalEntity | undefined;
    this.pendingDraft = {
      entityId: finalContent.targetId,
      messageId,
      source: "merge",
      chronicle: finalContent.suggestedBody || entity?.content || "",
      // See buildRevisionDraft: an empty proposed value must not erase the
      // entity's existing lore (#2584).
      lore: finalContent.suggestedFrontmatter?.lore || entity?.lore || "",
      merge: {
        sourceIds,
        finalContent,
      },
      timestamp: this.clock.now(),
    };
    vault.selectedEntityId = finalContent.targetId;
  }

  /**
   * Lets the reader review a revision section by section before it is written
   * (#2588, #2591).
   *
   * A revision replaces the whole lore string, so a "focus on X" instruction
   * can return one section where several existed. The first fix asked a yes/no
   * question, which told the reader *that* something changed but not *what* —
   * and forced an all-or-nothing answer. This opens a diff instead: current
   * versus revised per section, with keep / replace / both, and dropped
   * sections defaulted to being kept.
   *
   * Only opens when something actually differs; an identical revision applies
   * silently. Returns the lore to write, or null if the reader cancelled — in
   * which case the whole apply is abandoned rather than falling through to a
   * value they did not choose.
   */
  private async resolveLoreChanges(
    entityId: string,
    proposedLore: string,
  ): Promise<string | null> {
    const entity = vault.entities[entityId] as LocalEntity | undefined;
    const existingLore = entity?.lore ?? "";

    // Nothing to lose: first lore on an entity applies without ceremony.
    if (!existingLore.trim()) return proposedLore;

    const plan = buildLoreMergePlan(existingLore, proposedLore);
    if (!plan.hasChanges) return proposedLore;

    return loreMergeStore.request(plan, entity?.title ?? "");
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
        const patch = this.buildAcceptPatch(this.pendingDraft);
        if (patch.lore !== undefined) {
          const resolved = await this.resolveLoreChanges(
            this.pendingDraft.entityId,
            patch.lore,
          );
          if (resolved === null) return;
          patch.lore = resolved;
        }
        await vault.updateEntity(this.pendingDraft.entityId, patch);
      }
      if (acceptedDraft.generatorSessionCommit) {
        const entity = vault.entities[acceptedDraft.entityId] as
          LocalEntity | undefined;
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
