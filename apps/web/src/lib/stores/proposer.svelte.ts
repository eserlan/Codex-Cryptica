import { vault } from "./vault.svelte";
import { oracle } from "./oracle.svelte";
import { uiStore } from "./ui.svelte";
import { proposerBridge } from "../cloud-bridge/proposer-bridge";
import { TIER_MODES } from "schema";
import type { Proposal } from "@codex/proposer";
import { ProposerService } from "@codex/proposer";
import { getDB, DB_NAME, DB_VERSION } from "../utils/idb";

class ProposerStore {
  private service: ProposerService | null = null;
  isAnalyzing = $state(false);
  isLoadingProposals = $state(false);
  analysisError = $state<string | null>(null);
  proposals = $state<Record<string, Proposal[]>>({}); // keyed by entityId
  history = $state<Record<string, Proposal[]>>({}); // keyed by entityId

  activeProposals = $derived.by(() => {
    if (!vault.selectedEntityId) return [];

    // Deduplicate from history/store load so old DB states don't cause duplicate keys
    // We pick the best proposal per target (highest confidence, then latest timestamp)
    const raw = this.proposals[vault.selectedEntityId] || [];
    const bestByTarget = new Map<string, Proposal>();

    for (const p of raw) {
      // Reject ghost entities that no longer exist in the vault
      if (!vault.entities[p.targetId]) continue;

      const existing = bestByTarget.get(p.targetId);
      if (
        !existing ||
        p.confidence > existing.confidence ||
        (p.confidence === existing.confidence &&
          p.timestamp > existing.timestamp)
      ) {
        bestByTarget.set(p.targetId, p);
      }
    }

    return Array.from(bestByTarget.values()).sort(
      (a, b) => b.confidence - a.confidence,
    );
  });

  activeHistory = $derived.by(() => {
    if (!vault.selectedEntityId) return [];

    const raw = this.history[vault.selectedEntityId] || [];
    const bestByTarget = new Map<string, Proposal>();

    for (const p of raw) {
      if (!vault.entities[p.targetId]) continue;

      const existing = bestByTarget.get(p.targetId);
      if (!existing || p.timestamp > existing.timestamp) {
        bestByTarget.set(p.targetId, p);
      }
    }

    return Array.from(bestByTarget.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  });

  constructor() {
    //
  }

  private getService(): ProposerService {
    if (!this.service) {
      this.service = new ProposerService(DB_NAME, DB_VERSION, getDB());
    }
    return this.service;
  }

  async loadProposals(entityId: string) {
    if (this.isLoadingProposals) return;

    this.isLoadingProposals = true;
    try {
      const service = this.getService();
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
    if (uiStore.liteMode) return;
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
      // Also exclude entities that have an inbound connection to this entity (bidirectional prevention)
      const existingConnectedIds = new Set(
        entity.connections.map((c) => c.target),
      );
      for (const inbound of vault.inboundConnections[entityId] || []) {
        existingConnectedIds.add(inbound.sourceId);
      }

      // ⚡ Bolt Optimization: Replace full array Object.values().filter().map() with a single imperative loop.
      // Avoids intermediate array allocations and reduces iterations from 3 to 1, reducing GC pressure.
      const allEntities = vault.allEntities;
      const count = allEntities.length;
      const targets: { id: string; name: string }[] = [];

      for (let i = 0; i < count; i++) {
        const e = allEntities[i];
        if (e.id !== entityId && !existingConnectedIds.has(e.id)) {
          targets.push({ id: e.id, name: e.title });
        }
      }

      // Use the lite model for background tasks to save cost/latency
      const modelName = TIER_MODES["lite"];

      const newProposals = await proposerBridge.analyzeEntity(
        apiKey,
        modelName,
        entityId,
        `${entity.content || ""} \n\n ${entity.lore || ""}`.trim(),
        targets,
      );

      // Guard against stale updates
      if (vault.selectedEntityId !== entityId) return;

      const service = this.getService();
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
    const connectionCreated = await vault.addConnection(
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

    const service = this.getService();
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
    const service = this.getService();
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
    if (this.history[proposal.sourceId].length > 20) {
      this.history[proposal.sourceId].pop();
    }
  }

  async reEvaluate(proposal: Proposal) {
    const service = this.getService();
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
