import { oracle } from "$lib/stores/oracle.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { uiStore } from "$lib/stores/ui.svelte";
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

      this.pendingDraft = {
        entityId,
        chronicle: parsed.chronicle,
        lore: parsed.lore,
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

  async acceptDraft() {
    if (!this.pendingDraft) return;

    try {
      await vault.updateEntity(this.pendingDraft.entityId, {
        content: this.pendingDraft.chronicle,
        lore: this.pendingDraft.lore,
      });
      this.discardDraft();
      uiStore.notify("AI content saved successfully.", "success");
    } catch (err: any) {
      uiStore.notify(`Failed to save AI content: ${err.message}`, "error");
    }
  }

  discardDraft() {
    this.pendingDraft = null;
  }
}

export const regenerationService = new RegenerationService();
export default regenerationService;
