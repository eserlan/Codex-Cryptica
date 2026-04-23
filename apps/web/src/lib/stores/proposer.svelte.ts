import { vault } from "./vault.svelte";
import { oracle } from "./oracle.svelte";
import { uiStore } from "./ui.svelte";
import { proposerBridge } from "../cloud-bridge/proposer-bridge";
import { debugStore } from "./debug.svelte";
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

  allPendingProposals = $state<Proposal[]>([]);
  allAcceptedProposals = $state<Proposal[]>([]);
  allVerifiedProposals = $state<Proposal[]>([]);

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

  async loadProposals(entityId: string, requireSelection = true) {
    if (this.isLoadingProposals) return;

    const vaultId = vault.activeVaultId;
    if (!vaultId) return;

    this.isLoadingProposals = true;
    try {
      const service = this.getService();
      const p = await service.getProposals(vaultId, entityId);
      const h = await service.getHistory(vaultId, entityId);

      // Guard against stale updates if navigation happened
      if (requireSelection && vault.selectedEntityId !== entityId) return;

      this.proposals[entityId] = p;
      this.history[entityId] = h;
    } finally {
      this.isLoadingProposals = false;
    }
  }

  async loadGlobalProposals() {
    const vaultId = vault.activeVaultId;
    if (!vaultId) {
      this.allPendingProposals = [];
      this.allAcceptedProposals = [];
      this.allVerifiedProposals = [];
      return;
    }

    this.isLoadingProposals = true;
    try {
      const service = this.getService();
      this.allPendingProposals = await service.getAllPendingProposals(vaultId);
      this.allAcceptedProposals =
        await service.getAllAcceptedProposals(vaultId);
      this.allVerifiedProposals =
        await service.getAllVerifiedProposals(vaultId);
    } finally {
      this.isLoadingProposals = false;
    }
  }

  async verify(proposal: Proposal) {
    const service = this.getService();
    await service.verifyProposal(proposal.id);
    this.allAcceptedProposals = this.allAcceptedProposals.filter(
      (p) => p.id !== proposal.id,
    );
    const verifiedProposal = {
      ...proposal,
      status: "verified" as const,
      timestamp: Date.now(),
    };
    this.allVerifiedProposals = [
      verifiedProposal,
      ...this.allVerifiedProposals,
    ];

    // Update per-entity cache if it exists
    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[
        proposal.sourceId
      ].filter((p) => p.id !== proposal.id);
    }

    debugStore.log("[ProposerStore] Verified AI connection", {
      proposalId: proposal.id,
    });
  }

  async undo(proposal: Proposal) {
    // Remove connection from vault
    const removed = await vault.removeConnection(
      proposal.sourceId,
      proposal.targetId,
      proposal.type,
    );

    if (!removed) {
      debugStore.warn(
        "[ProposerStore] Failed to remove vault connection for undo",
        { proposal },
      );
    }

    const service = this.getService();
    await service.dismissProposal(proposal.id);

    // Update state
    this.allAcceptedProposals = this.allAcceptedProposals.filter(
      (p) => p.id !== proposal.id,
    );
    this.allVerifiedProposals = this.allVerifiedProposals.filter(
      (p) => p.id !== proposal.id,
    );

    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[
        proposal.sourceId
      ].filter((p) => p.id !== proposal.id);
    }

    // Add to history with updated status
    const dismissedProposal = {
      ...proposal,
      status: "rejected" as const,
      timestamp: Date.now(),
    };
    if (!this.history[proposal.sourceId]) this.history[proposal.sourceId] = [];
    this.history[proposal.sourceId] = [
      dismissedProposal,
      ...this.history[proposal.sourceId],
    ];

    debugStore.log("[ProposerStore] Undid AI connection", {
      proposalId: proposal.id,
    });
  }

  async analyzeCurrentEntity() {
    if (uiStore.aiDisabled) return;
    const entityId = vault.selectedEntityId;
    if (!entityId || this.isAnalyzing) return;
    await this.analyzeEntityById(entityId, true);
  }

  async analyzeEntityById(
    entityId: string,
    requireSelection = false,
    analysisText?: string,
  ) {
    if (uiStore.aiDisabled || this.isAnalyzing) return;

    const vaultId = vault.activeVaultId;
    if (!vaultId) return;

    this.analysisError = null;

    // Load existing proposals/history if not loaded
    if (!this.proposals[entityId]) {
      await this.loadProposals(entityId, requireSelection);
      // If the user changed the selected entity while loading, abort this analysis
      if (requireSelection && vault.selectedEntityId !== entityId) return;
    }

    const apiKey = oracle.effectiveApiKey || "";

    const entity = vault.entities[entityId];
    if (!entity) {
      debugStore.warn(
        `[ProposerStore] Skipping connection analysis for ${entityId}: entity missing from vault`,
      );
      return;
    }

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

      // ⚡ Bolt Optimization: Use a single imperative loop over vault.allEntities instead of chaining .filter().map().
      // vault.allEntities is already Object.values(...), so we still pay for that pass, but we avoid extra arrays and
      // two additional traversals over the entities, which reduces allocations and GC pressure.
      const allEntities = vault.allEntities;
      const count = allEntities.length;
      const targets: { id: string; name: string }[] = [];

      for (let i = 0; i < count; i++) {
        const e = allEntities[i];
        if (e.id !== entityId && !existingConnectedIds.has(e.id)) {
          targets.push({ id: e.id, name: e.title });
        }
      }

      // Use the basic model for background tasks to save cost/latency
      const modelName = TIER_MODES["lite"];

      const sourceText = analysisText?.trim()
        ? analysisText.trim()
        : `${entity.content || ""} \n\n ${entity.lore || ""}`.trim();

      debugStore.log("[ProposerStore] Starting connection analysis", {
        entityId,
        title: entity.title,
        targetCount: targets.length,
        sourceTextLength: sourceText.length,
        usedOverrideText: Boolean(analysisText?.trim()),
        mode: apiKey ? "custom-key" : "system-proxy",
      });

      const newProposals = await proposerBridge.analyzeEntity(
        apiKey,
        modelName,
        vaultId,
        entityId,
        sourceText,
        targets,
      );

      // Guard against stale updates
      if (requireSelection && vault.selectedEntityId !== entityId) return;

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

      debugStore.log("[ProposerStore] Connection analysis completed", {
        entityId,
        title: entity.title,
        rawProposalCount: newProposals.length,
        addedProposalCount: toAdd.length,
      });
    } catch (err: any) {
      debugStore.error("[ProposerStore] Connection analysis failed", {
        entityId,
        error: err,
      });
      this.analysisError = err.message || "Analysis failed";
    } finally {
      this.isAnalyzing = false;
    }
  }

  async analyzeAndApplyEntityById(entityId: string, analysisText?: string) {
    await this.analyzeEntityById(entityId, false, analysisText);

    const proposals = [...(this.proposals[entityId] || [])];
    let appliedCount = 0;
    let failedCount = 0;

    debugStore.log("[ProposerStore] Applying connection proposals", {
      entityId,
      proposalCount: proposals.length,
    });

    for (const proposal of proposals) {
      const applied = await this.apply(proposal);
      if (applied) {
        appliedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    debugStore.log("[ProposerStore] Finished applying connection proposals", {
      entityId,
      appliedCount,
      failedCount,
    });

    return appliedCount;
  }

  async apply(proposal: Proposal) {
    // Create actual connection in vault first; only proceed if successful
    const connectionCreated = await vault.addConnection(
      proposal.sourceId,
      proposal.targetId,
      proposal.type,
    );
    if (!connectionCreated) {
      debugStore.warn("[ProposerStore] Failed to create vault connection", {
        proposal,
      });
      return false;
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
    debugStore.log("[ProposerStore] Applied connection proposal", {
      proposalId: proposal.id,
      sourceId: proposal.sourceId,
      targetId: proposal.targetId,
      type: proposal.type,
    });
    return true;
  }

  async dismiss(proposal: Proposal) {
    const service = this.getService();
    await service.dismissProposal(proposal.id);
    if (this.proposals[proposal.sourceId]) {
      this.proposals[proposal.sourceId] = this.proposals[
        proposal.sourceId
      ].filter((p) => p.id !== proposal.id);
    }
    // Add to history with updated status
    const dismissedProposal = {
      ...proposal,
      status: "rejected" as const,
      timestamp: Date.now(),
    };
    if (!this.history[proposal.sourceId]) this.history[proposal.sourceId] = [];
    this.history[proposal.sourceId] = [
      dismissedProposal,
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

  async clearVault(vaultId: string) {
    const service = this.getService();
    await service.clearVault(vaultId);
    // Clear in-memory caches if this was the active vault
    if (vault.activeVaultId === vaultId) {
      this.proposals = {};
      this.history = {};
      this.allPendingProposals = [];
      this.allAcceptedProposals = [];
      this.allVerifiedProposals = [];
    }
  }
}

export const proposerStore = new ProposerStore();
