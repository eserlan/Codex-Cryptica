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
    this.proposals[entityId] = await service.getProposals(entityId);
    this.history[entityId] = await service.getHistory(entityId);
  }

  async analyzeCurrentEntity() {
    const entityId = vault.selectedEntityId;
    if (!entityId || this.isAnalyzing) return;

    // Load existing proposals/history if not loaded
    if (!this.proposals[entityId]) {
      await this.loadProposals(entityId);
    }

    const apiKey = oracle.effectiveApiKey;
    if (!apiKey) return;

    const entity = vault.entities[entityId];
    if (!entity) return;

    this.isAnalyzing = true;
    try {
      // Prepare available targets (all other entities)
      // Exclude already connected entities (FR-007)
      const existingTargetIds = new Set(entity.connections.map(c => c.target));
      
      const targets = Object.values(vault.entities)
        .filter(e => e.id !== entityId && !existingTargetIds.has(e.id))
        .map(e => ({ id: e.id, name: e.title }));
        
      // Use the lite model for background tasks to save cost/latency
      const modelName = TIER_MODES["lite"];

      const newProposals = await proposerBridge.analyzeEntity(
        apiKey,
        modelName,
        entityId,
        entity.content || "",
        targets
      );
      
      await service.saveProposals(newProposals);
      // Merge with existing pending proposals to avoid overwriting user interactions?
      // Or just replace? analyzeEntity returns ALL found proposals?
      // No, it returns new ones.
      // But if we have pending proposals, we should keep them if they are still valid.
      // Simplest approach: Add new ones that don't exist.
      // Since ID handles uniqueness, we can merge.
      
      const existing = this.proposals[entityId] || [];
      const existingIds = new Set(existing.map(p => p.id));
      const historyIds = new Set((this.history[entityId] || []).map(p => p.id));
      
      const toAdd = newProposals.filter(p => !existingIds.has(p.id) && !historyIds.has(p.id));
      
      this.proposals[entityId] = [...existing, ...toAdd];
      
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      this.isAnalyzing = false;
    }
  }

  async apply(proposal: Proposal) {
    await service.applyProposal(proposal.id);
    // Update local state
    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[proposal.sourceId].filter(p => p.id !== proposal.id);
    }
    // Create actual connection in vault
    vault.addConnection(proposal.sourceId, proposal.targetId, proposal.type);
  }

  async dismiss(proposal: Proposal) {
    await service.dismissProposal(proposal.id);
    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[proposal.sourceId].filter(p => p.id !== proposal.id);
    }
    // Add to history
    if (!this.history[proposal.sourceId]) this.history[proposal.sourceId] = [];
    this.history[proposal.sourceId] = [proposal, ...this.history[proposal.sourceId]];
  }

  async reEvaluate(proposal: Proposal) {
    await service.reEvaluateProposal(proposal.id);
    // Move from history to proposals
    if (this.history[proposal.sourceId]) {
      this.history[proposal.sourceId] = this.history[proposal.sourceId].filter(p => p.id !== proposal.id);
    }
    if (!this.proposals[proposal.sourceId]) this.proposals[proposal.sourceId] = [];
    this.proposals[proposal.sourceId] = [...this.proposals[proposal.sourceId], proposal];
  }
}

export const proposerStore = new ProposerStore();
