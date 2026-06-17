import {
  buildRelatedEntityContext,
  type DiscoveryProposal,
} from "@codex/oracle-engine";
import type { Entity } from "schema";
import type {
  EntityRevisionRequest,
  EntityRevisionResult,
  IOracleStore,
} from "./types";

export class OracleRevisionManager {
  constructor(private store: IOracleStore) {}

  private async reviseEntityFields(
    existing: Entity,
    incoming: { chronicle: string; lore: string },
    options: {
      source?: string;
      instructions?: string;
      priority?: "instructions-first" | "incoming-first" | "preserve-existing";
      themeId?: string;
    } = {},
  ): Promise<{ content: string; lore: string; categoryId?: string }> {
    const s = this.store;
    if (!s.textGeneration.reviseEntityUpdate) {
      throw new Error("reviseEntityUpdate not available");
    }
    const snapExisting = $state.snapshot(existing);
    const snapIncoming = $state.snapshot(incoming);
    const snapContext = $state.snapshot(
      buildRelatedEntityContext({
        entity: existing,
        incoming,
        instructions: options.instructions,
        vault: s.vault,
        getConsolidatedContext: (related) =>
          related.content?.trim() ||
          s.contextRetrieval.getConsolidatedContext(related),
        debug: import.meta.env.DEV
          ? (sel) => console.log("[RevisionContext] selected related:", sel)
          : undefined,
      }),
    );
    const snapCategories = $state.snapshot(s.categories.list).map((c: any) => ({
      id: c.id,
      label: c.label,
    }));

    return s.textGeneration.reviseEntityUpdate(
      s.effectiveApiKey || "",
      s.modelName,
      snapExisting,
      snapIncoming,
      snapContext,
      snapCategories,
      {
        source: options.source,
        instructions: options.instructions,
        priority: options.priority,
        themeId: this.store.themeStore?.activeTheme?.id,
      },
    );
  }

  async reviseEntity(
    request: EntityRevisionRequest,
  ): Promise<EntityRevisionResult> {
    const s = this.store;
    const existing = this.resolveRevisionEntity(request);
    const incoming = {
      chronicle: request.incoming?.chronicle || "",
      lore: request.incoming?.lore || "",
    };
    const fallback = () => this.buildRevisionFallback(existing, request);

    if (
      s.vault.isGuest ||
      s.discoveryPolicyStore.aiDisabled ||
      !s.textGeneration.reviseEntityUpdate
    ) {
      return fallback();
    }

    try {
      const revised = await this.reviseEntityFields(existing, incoming, {
        source: request.source,
        instructions: request.instructions,
        priority: request.priority,
      });
      const emptyResultFallback = this.buildEmptyRevisionFallback(
        existing,
        request,
      );
      return {
        content: revised.content || emptyResultFallback.content,
        lore: revised.lore || emptyResultFallback.lore,
        categoryId: revised.categoryId,
      };
    } catch {
      return fallback();
    }
  }

  async reviseSmartApply(
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
      !s.textGeneration.reviseEntityUpdate
    ) {
      return fallback();
    }

    try {
      const revised = await this.reviseEntityFields(
        existing,
        {
          chronicle: incoming.chronicle || "",
          lore: incoming.lore || "",
        },
        {
          source: "smart-apply",
          priority: "incoming-first",
        },
      );
      return {
        content: revised.content || existing.content || "",
        lore: revised.lore || existing.lore || "",
        categoryId: revised.categoryId,
      };
    } catch {
      return fallback();
    }
  }

  async reviseDiscoveryProposal(proposal: DiscoveryProposal) {
    const s = this.store;
    if (!proposal.entityId) {
      throw new Error("Discovery proposal does not target an existing record.");
    }

    const existing = s.vault.entities[proposal.entityId];
    if (!existing) {
      throw new Error(`Entity ${proposal.entityId} was not found.`);
    }

    return this.reviseEntity({
      source: "discovery",
      entityId: proposal.entityId,
      incoming: proposal.draft,
      priority: "incoming-first",
    });
  }

  async reviseNewEntityDraft(
    title: string,
    type: string,
    draft: { chronicle: string; lore: string },
  ): Promise<{ content: string; lore: string; categoryId?: string }> {
    return this.reviseEntity({
      source: "discovery",
      title,
      type,
      incoming: draft,
      priority: "incoming-first",
    });
  }

  private resolveRevisionEntity(request: EntityRevisionRequest): Entity {
    if (request.entityId) {
      const existing = this.store.vault.entities[request.entityId];
      if (!existing) throw new Error(`Entity ${request.entityId} not found.`);
      return existing;
    }

    return {
      id: "",
      title: request.title || "Untitled",
      type: request.type || "note",
      content: "",
      lore: "",
    } as Entity;
  }

  private buildRevisionFallback(
    existing: Entity,
    request: EntityRevisionRequest,
  ): EntityRevisionResult {
    const incoming = request.incoming || {};

    if (!existing.id) {
      return {
        content: incoming.chronicle || existing.content || "",
        lore: incoming.lore || existing.lore || "",
      };
    }

    if (request.source === "revise") {
      return {
        content: existing.content || incoming.chronicle || "",
        lore: existing.lore || incoming.lore || "",
      };
    }

    if (request.source === "discovery" || request.source === "auto-archive") {
      return {
        content: existing.content || incoming.chronicle || "",
        lore: incoming.lore
          ? existing.lore
            ? existing.lore + "\n\n" + incoming.lore
            : incoming.lore
          : existing.lore || "",
      };
    }

    return {
      content: incoming.chronicle
        ? existing.content
          ? existing.content + "\n\n" + incoming.chronicle
          : incoming.chronicle
        : existing.content || "",
      lore: incoming.lore
        ? existing.lore
          ? existing.lore + "\n\n" + incoming.lore
          : incoming.lore
        : existing.lore || "",
    };
  }

  private buildEmptyRevisionFallback(
    existing: Entity,
    request: EntityRevisionRequest,
  ): EntityRevisionResult {
    const incoming = request.incoming || {};
    return {
      content: existing.content || incoming.chronicle || "",
      lore: existing.lore || incoming.lore || "",
    };
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
      apply: false,
      analysisText,
    });
    return typeof result === "number" ? result : 0;
  }
}
