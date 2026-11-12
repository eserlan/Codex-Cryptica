import type { AdventureSession } from "@codex/adventure-engine";
import { LoreDeltaTracker } from "@codex/oracle-engine";
import type {
  AdventureInteraction,
  AdventurePrompt,
} from "./adventure-generation.types";
import { adventureSourceHash } from "./adventure-interaction-input";

// Continue long stories across many turns; refresh from local state before
// retained provider history becomes excessively large. Expiry and invalid IDs
// independently trigger a fresh conversation at any time.
const CONTEXT_REFRESH_TURNS = 80;

export class AdventureInteractionContext {
  private readonly interactions = new Map<string, AdventureInteraction>();

  get(sessionId: string): AdventureInteraction {
    let interaction = this.interactions.get(sessionId);
    if (!interaction) {
      interaction = {
        previousInteractionId: null,
        tracker: new LoreDeltaTracker(),
        successfulTurns: 0,
        revision: null,
        stateSnapshot: null,
        sourceHashes: new Map(),
        modelName: null,
        pending: null,
      };
      this.interactions.set(sessionId, interaction);
    }
    return interaction;
  }

  /** Drops retained provider context after an uncommitted or ended session. */
  clear(sessionId: string): void {
    this.interactions.delete(sessionId);
  }

  /** Promote a provider interaction only after the adventure repository saved
   * the corresponding validated turn. A generated-but-unsaved reply is discarded. */
  confirm(sessionId: string, savedRevision?: number): void {
    const interaction = this.interactions.get(sessionId);
    if (!interaction) return;
    const pending = interaction.pending;
    if (!pending) {
      // Dice outcomes, dismissals and other deterministic local saves need
      // no AI turn, but must not break the retained provider conversation.
      // The next request sends these local changes via stateDelta.
      if (
        interaction.previousInteractionId &&
        savedRevision !== undefined &&
        interaction.revision === savedRevision - 1
      )
        interaction.revision = savedRevision;
      return;
    }
    if (savedRevision !== undefined && savedRevision !== pending.revision + 1) {
      this.clear(sessionId);
      return;
    }
    interaction.previousInteractionId = pending.id;
    interaction.modelName = pending.modelName;
    interaction.revision = pending.revision + 1;
    interaction.stateSnapshot = pending.state;
    interaction.tracker.commit(pending.sourceEntries);
    for (const entry of pending.sourceEntries) {
      interaction.sourceHashes.set(entry.id, entry.hash);
    }
    interaction.successfulTurns += 1;
    interaction.pending = null;
  }

  prepare(
    session: AdventureSession,
    prompt: AdventurePrompt,
    modelName: string,
  ): AdventureInteraction {
    let interaction = this.get(session.id);
    // A revision mismatch means the game was changed by a non-model action,
    // a failed save, or a cancelled turn: rebuild from authoritative OPFS.
    if (
      interaction.pending ||
      (interaction.modelName !== null && interaction.modelName !== modelName) ||
      (interaction.revision !== null &&
        interaction.revision !== session.revision) ||
      interaction.successfulTurns >= CONTEXT_REFRESH_TURNS
    ) {
      this.clear(session.id);
      interaction = this.get(session.id);
    }
    // Provider histories cannot delete earlier source text. A changed
    // canonical record must start a clean thread to avoid stale canon.
    const sources = [...prompt.anchors, ...prompt.relevant];
    if (
      sources.some((source) => {
        const oldHash = interaction.sourceHashes.get(source.recordId);
        return oldHash && oldHash !== adventureSourceHash(source);
      })
    ) {
      this.clear(session.id);
      interaction = this.get(session.id);
    }

    return interaction;
  }
}
