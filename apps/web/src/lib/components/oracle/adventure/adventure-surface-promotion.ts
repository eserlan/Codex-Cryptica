import type {
  AdventureSession,
  ProvisionalFact,
} from "@codex/adventure-engine";
import type { Entity } from "schema";
import {
  batchFilterPromotableFacts,
  createAdventureEntityDraft,
  promoteProvisionalFacts,
  type FactPromotionDeps,
} from "#lib/services/adventure/adventure-provisional-fact-creator.js";

interface PromotionDependencies {
  getSession: () => AdventureSession | null;
  getVaultId: () => string | null | undefined;
  getEntities: () => Pick<Entity, "id" | "title">[];
  isReady: () => boolean;
  isAutoPromote: () => boolean;
  createEntity: FactPromotionDeps["createEntity"];
  linkPlaceRecord: (name: string, recordId: string) => Promise<unknown>;
  notify: (message: string, level: "info" | "success") => void;
}

/** Per-surface manual and automatic promotion, with session/Vault currency checks. */
export class AdventureSurfacePromotion {
  private autoPromoting = false;
  private readonly processedFactIds = new Set<string>();

  constructor(private readonly deps: PromotionDependencies) {}

  private requireSession(): AdventureSession {
    const session = this.deps.getSession();
    if (!session) throw new Error("No active adventure.");
    return session;
  }

  private findExistingId(title: string): string | undefined {
    return this.deps
      .getEntities()
      .find(
        (entity) =>
          entity.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase(),
      )?.id;
  }

  /** Best effort: title matching at the next turn can finish a failed place link. */
  private linkRecord = async (
    fact: ProvisionalFact,
    recordId: string,
  ): Promise<void> => {
    if (fact.kind !== "place") return;
    try {
      await this.deps.linkPlaceRecord(fact.name, recordId);
    } catch {
      // The title match at the next turn links it instead.
    }
  };

  private promotionDeps(
    sessionId: string,
    vaultId: string | null | undefined,
  ): FactPromotionDeps {
    return {
      isCurrent: () =>
        this.deps.getSession()?.id === sessionId &&
        this.deps.getVaultId() === vaultId,
      findExistingId: (title) => this.findExistingId(title.trim()),
      createEntity: this.deps.createEntity,
      linkRecord: this.linkRecord,
    };
  }

  private notifyAdded(prefix: string, count: number): void {
    if (count > 0)
      this.deps.notify(
        `${prefix} ${count} ${count === 1 ? "discovery" : "discoveries"} to Codex.`,
        "success",
      );
  }

  add = async (fact: ProvisionalFact): Promise<void> => {
    const session = this.requireSession();
    const deps = this.promotionDeps(session.id, this.deps.getVaultId());
    const draft = createAdventureEntityDraft(fact, session.title);
    if (!draft) throw new Error("This discovery is not available to save.");
    const existingId = this.findExistingId(draft.title);
    if (existingId) {
      if (!deps.isCurrent())
        throw new Error("The active adventure or Vault changed.");
      await this.linkRecord(fact, existingId);
      this.deps.notify(`${draft.title} is already in Codex.`, "info");
      return;
    }
    const { added, interrupted } = await promoteProvisionalFacts(
      [fact],
      session.title,
      deps,
    );
    if (interrupted) throw new Error("The active adventure or Vault changed.");
    if (added > 0)
      this.deps.notify(`Added ${draft.title} to Codex.`, "success");
  };

  addAll = async (facts: ProvisionalFact[]): Promise<void> => {
    const session = this.requireSession();
    const { added, interrupted } = await promoteProvisionalFacts(
      facts,
      session.title,
      this.promotionDeps(session.id, this.deps.getVaultId()),
    );
    if (interrupted)
      throw new Error(
        "The active adventure changed. Add the remaining discoveries from that adventure.",
      );
    this.notifyAdded("Added", added);
  };

  async autoPromote(existingTitles: string[]): Promise<void> {
    const session = this.deps.getSession();
    if (!session || !this.deps.isAutoPromote() || !this.deps.isReady()) return;
    const vaultId = this.deps.getVaultId();
    const pending = batchFilterPromotableFacts(
      session.provisionalFacts ?? [],
      existingTitles,
      [
        ...this.processedFactIds,
        ...(session.dismissedProvisionalFactIds ?? []),
      ],
    );
    if (pending.length === 0 || this.autoPromoting) return;
    this.autoPromoting = true;
    try {
      const { added } = await promoteProvisionalFacts(pending, session.title, {
        ...this.promotionDeps(session.id, vaultId),
        onAttempt: (fact) => this.processedFactIds.add(fact.id),
      });
      this.notifyAdded("Auto-promoted", added);
    } catch (error) {
      console.error("Auto-promote error:", error);
    } finally {
      this.autoPromoting = false;
    }
  }
}
