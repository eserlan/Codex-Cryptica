import { vault } from "./vault.svelte";
import { oracle } from "./oracle.svelte";
import { proposerBridge } from "../cloud-bridge/proposer-bridge";
import { TIER_MODES } from "../services/ai";
import type { Proposal } from "@codex/proposer";
import { ProposerService } from "@codex/proposer";

// We use the service directly for DB operations (get/apply/dismiss)
// and the bridge for heavy analysis tasks.
const service = new ProposerService();

class ProposerStore {
  isAnalyzing = $state(false);
  isLoadingProposals = $state(false);
  analysisError = $state<string | null>(null);
  proposals = $state<Record<string, Proposal[]>>({}); // keyed by entityId
  history = $state<Record<string, Proposal[]>>({}); // keyed by entityId

  activeProposals = $derived.by(() => {
    if (!vault.selectedEntityId) return [];
    return this.proposals[vault.selectedEntityId] || [];
  });

  activeHistory = $derived.by(() => {
    if (!vault.selectedEntityId) return [];
    return this.history[vault.selectedEntityId] || [];
  });

  constructor() {
    //
  }

  async loadProposals(entityId: string) {
    if (this.isLoadingProposals) return;

    this.isLoadingProposals = true;
    try {
      const p = await service.getProposals(entityId);
      const h = await service.getHistory(entityId);

      // Guard against stale updates if navigation happened
      if (vault.selectedEntityId !== entityId) return;

      this.proposals[entityId] = p;
      this.history[entityId] = h;
    } finally {
      this.isLoadingProposals = false;
    }
  }

  async analyzeCurrentEntity() {
    const entityId = vault.selectedEntityId;
    if (!entityId || this.isAnalyzing) return;

    this.analysisError = null;

    // Load existing proposals/history if not loaded
    if (!this.proposals[entityId]) {
      await this.loadProposals(entityId);
      // If the user changed the selected entity while loading, abort this analysis
      if (vault.selectedEntityId !== entityId) return;
    }

    const apiKey = oracle.effectiveApiKey;
    if (!apiKey) return;

    const entity = vault.entities[entityId];
    if (!entity) return;

    this.isAnalyzing = true;
    try {
      // Prepare available targets (all other entities)
      // Exclude already connected entities (FR-007)
      const existingTargetIds = new Set(
        entity.connections.map((c) => c.target),
      );

      const targets = Object.values(vault.entities)
        .filter((e) => e.id !== entityId && !existingTargetIds.has(e.id))
        .map((e) => ({ id: e.id, name: e.title }));

      // Use the lite model for background tasks to save cost/latency
      const modelName = TIER_MODES["lite"];

      const newProposals = await proposerBridge.analyzeEntity(
        apiKey,
        modelName,
        entityId,
        entity.content || "",
        targets,
      );

      // Guard against stale updates
      if (vault.selectedEntityId !== entityId) return;

      await service.saveProposals(newProposals);

      const existing = this.proposals[entityId] || [];
      const existingIds = new Set(existing.map((p) => p.id));
      const historyIds = new Set(
        (this.history[entityId] || []).map((p) => p.id),
      );

      const toAdd = newProposals.filter(
        (p) => !existingIds.has(p.id) && !historyIds.has(p.id),
      );

      this.proposals[entityId] = [...existing, ...toAdd];
    } catch (err: any) {
      console.error("Analysis failed", err);
      this.analysisError = err.message || "Analysis failed";
    } finally {
      if (vault.selectedEntityId === entityId) {
        this.isAnalyzing = false;
      }
    }
  }

  async apply(proposal: Proposal) {
    // Create actual connection in vault first; only proceed if successful
    const connectionCreated = vault.addConnection(
      proposal.sourceId,
      proposal.targetId,
      proposal.type,
    );
    if (!connectionCreated) {
      console.error(
        "Failed to create connection in vault for proposal",
        proposal,
      );
      return;
    }

    await service.applyProposal(proposal.id);

    // Update local state - verify context is still valid or just update store state regardless
    // Updating store state regardless is safer for consistency.
    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[
        proposal.sourceId
      ].filter((p) => p.id !== proposal.id);
    }
  }

  async dismiss(proposal: Proposal) {
    await service.dismissProposal(proposal.id);
    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[
        proposal.sourceId
      ].filter((p) => p.id !== proposal.id);
    }
    // Add to history
    if (!this.history[proposal.sourceId]) this.history[proposal.sourceId] = [];
    this.history[proposal.sourceId] = [
      proposal,
      ...this.history[proposal.sourceId],
    ];
  }

  async reEvaluate(proposal: Proposal) {
    await service.reEvaluateProposal(proposal.id);
    // Move from history to proposals
    if (this.history[proposal.sourceId]) {
      this.history[proposal.sourceId] = this.history[proposal.sourceId].filter(
        (p) => p.id !== proposal.id,
      );
    }
    if (!this.proposals[proposal.sourceId])
      this.proposals[proposal.sourceId] = [];
    this.proposals[proposal.sourceId] = [
      ...this.proposals[proposal.sourceId],
      proposal,
    ];
  }
}

export const proposerStore = new ProposerStore();
