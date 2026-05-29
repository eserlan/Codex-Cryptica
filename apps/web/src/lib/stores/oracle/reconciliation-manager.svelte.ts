import {
  buildRelatedEntityContext,
  type DiscoveryProposal,
} from "@codex/oracle-engine";
import type { Entity } from "schema";
import type { IOracleStore } from "./types";

export class OracleReconciliationManager {
  constructor(private store: IOracleStore) {}

  private async reconcileEntityFields(
    existing: Entity,
    incoming: { chronicle: string; lore: string },
  ): Promise<{ content: string; lore: string; categoryId?: string }> {
    const s = this.store;
    if (!s.textGeneration.reconcileEntityUpdate) {
      throw new Error("reconcileEntityUpdate not available");
    }
    const snapExisting = $state.snapshot(existing);
    const snapIncoming = $state.snapshot(incoming);
    const snapContext = $state.snapshot(
      buildRelatedEntityContext({
        entity: existing,
        incoming,
        vault: s.vault,
        getConsolidatedContext: (related) =>
          s.contextRetrieval.getConsolidatedContext(related),
      }),
    );
    const snapCategories = $state.snapshot(s.categories.list).map((c: any) => ({
      id: c.id,
      label: c.label,
    }));

    return s.textGeneration.reconcileEntityUpdate(
      s.effectiveApiKey || "",
      s.modelName,
      snapExisting,
      snapIncoming,
      snapContext,
      snapCategories,
    );
  }

  async reconcileSmartApply(
    entityId: string,
    incoming: { chronicle?: string; lore?: string },
  ): Promise<{ content?: string; lore?: string; categoryId?: string }> {
    const s = this.store;
    const existing = s.vault.entities[entityId];
    if (!existing) throw new Error(`Entity ${entityId} not found.`);

    const fallback = (): {
      content?: string;
      lore?: string;
      categoryId?: string;
    } => ({
      content: incoming.chronicle
        ? existing.content
          ? existing.content + "\n\n" + incoming.chronicle
          : incoming.chronicle
        : undefined,
      lore: incoming.lore
        ? existing.lore
          ? existing.lore + "\n\n" + incoming.lore
          : incoming.lore
        : undefined,
    });

    if (
      s.vault.isGuest ||
      s.discoveryPolicyStore.aiDisabled ||
      !s.textGeneration.reconcileEntityUpdate
    ) {
      return fallback();
    }

    try {
      const reconciled = await this.reconcileEntityFields(existing, {
        chronicle: incoming.chronicle || "",
        lore: incoming.lore || "",
      });
      return {
        content: reconciled.content || existing.content || "",
        lore: reconciled.lore || existing.lore || "",
        categoryId: reconciled.categoryId,
      };
    } catch {
      return fallback();
    }
  }

  async reconcileDiscoveryProposal(proposal: DiscoveryProposal) {
    const s = this.store;
    if (!proposal.entityId) {
      throw new Error("Discovery proposal does not target an existing record.");
    }

    const existing = s.vault.entities[proposal.entityId];
    if (!existing) {
      throw new Error(`Entity ${proposal.entityId} was not found.`);
    }

    if (
      s.vault.isGuest ||
      s.discoveryPolicyStore.aiDisabled ||
      !s.textGeneration.reconcileEntityUpdate
    ) {
      return {
        content: existing.content || proposal.draft.chronicle,
        lore: (existing.lore || "") + "\n\n" + proposal.draft.lore,
      };
    }

    try {
      return await this.reconcileEntityFields(existing, {
        chronicle: proposal.draft.chronicle,
        lore: proposal.draft.lore,
      });
    } catch {
      return {
        content: existing.content || proposal.draft.chronicle,
        lore: (existing.lore || "") + "\n\n" + proposal.draft.lore,
      };
    }
  }

  async reconcileNewEntityDraft(
    title: string,
    type: string,
    draft: { chronicle: string; lore: string },
  ): Promise<{ content: string; lore: string; categoryId?: string }> {
    const s = this.store;
    if (
      s.vault.isGuest ||
      s.discoveryPolicyStore.aiDisabled ||
      !s.textGeneration.reconcileEntityUpdate
    ) {
      return { content: draft.chronicle, lore: draft.lore };
    }

    const shell = {
      id: "",
      title,
      type,
      content: "",
      lore: "",
    } as Entity;

    try {
      const reconciled = await this.reconcileEntityFields(shell, draft);
      return {
        content: reconciled.content || draft.chronicle,
        lore: reconciled.lore || draft.lore,
        categoryId: reconciled.categoryId,
      };
    } catch {
      return { content: draft.chronicle, lore: draft.lore };
    }
  }

  async proposeConnectionsForEntity(
    entityId: string,
    options?: { apply?: boolean; analysisText?: string },
  ) {
    const { proposerStore } = await import("../proposer.svelte");
    if (options?.apply) {
      return proposerStore.analyzeAndApplyEntityById(
        entityId,
        options.analysisText,
      );
    }
    return proposerStore.analyzeEntityById(
      entityId,
      false,
      options?.analysisText,
    );
  }

  async handleDiscoveryConnectionsForEntity(
    entityId: string,
    analysisText?: string,
  ): Promise<number> {
    const mode = this.store.discoveryPolicyStore.connectionDiscoveryMode;
    if (mode === "off") {
      return 0;
    }

    const result = await this.proposeConnectionsForEntity(entityId, {
      apply: mode === "auto-apply",
      analysisText,
    });
    return typeof result === "number" ? result : 0;
  }
}
