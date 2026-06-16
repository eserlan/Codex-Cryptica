import { appEventBus } from "@codex/events";
import {
  GeneratorSession,
  buildGeneratorLoreEntries,
  type GeneratorAcceptedEntity,
  type GeneratorPromptMetrics,
} from "generator-engine";
import type { GeneratorVaultContext } from "generator-engine";

type GeneratorSessionInvalidationEvent = {
  type: string;
  payload?: Record<string, unknown>;
};

export interface GeneratorSessionInvalidationBus {
  subscribe(
    filter: string,
    listener: (event: GeneratorSessionInvalidationEvent) => void,
    name?: string,
  ): () => void;
}

export class GeneratorSessionManager {
  private static readonly MAX_METRICS = 50;
  private session = new GeneratorSession();
  private activeLoreEntries = buildGeneratorLoreEntries(undefined);
  private promptMetrics: GeneratorPromptMetrics[] = [];
  private invalidationUnsub: (() => void) | null = null;
  enabled = false;

  constructor(private readonly bus?: GeneratorSessionInvalidationBus) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.registerInvalidation();
      return;
    }
    this.reset();
  }

  prepare(params: {
    instruction: string;
    vaultContext?: GeneratorVaultContext;
  }) {
    this.activeLoreEntries = buildGeneratorLoreEntries(params.vaultContext);
    return this.session.prepareTurn({
      instruction: params.instruction,
      loreEntries: this.activeLoreEntries,
    });
  }

  commitInteraction(interactionId: string, replayed = false): void {
    if (replayed) this.session.reset();
    this.session.commitTurn(interactionId, this.activeLoreEntries);
  }

  commitAcceptedEntity(entity: GeneratorAcceptedEntity): void {
    this.session.commitAcceptedEntity(entity);
  }

  recordPromptMetrics(metrics: GeneratorPromptMetrics): void {
    this.promptMetrics = [...this.promptMetrics, metrics].slice(
      -GeneratorSessionManager.MAX_METRICS,
    );
  }

  getPromptMetrics(): readonly GeneratorPromptMetrics[] {
    return this.promptMetrics;
  }

  evictAcceptedEntity(entityId: string): void {
    this.session.evictAcceptedEntity(entityId);
  }

  reset(): void {
    this.session = new GeneratorSession();
    this.activeLoreEntries = buildGeneratorLoreEntries(undefined);
    this.promptMetrics = [];
  }

  registerInvalidation(): () => void {
    if (this.invalidationUnsub) return this.invalidationUnsub;
    if (!this.bus) {
      this.invalidationUnsub = () => {};
      return this.invalidationUnsub;
    }
    try {
      this.invalidationUnsub = this.bus.subscribe(
        "vault:*",
        (event) => {
          switch (event.type) {
            case "VAULT:ENTITY_UPDATED":
              if (typeof event.payload?.id === "string")
                this.evictAcceptedEntity(event.payload.id);
              break;
            case "VAULT:ENTITY_DELETED":
              if (typeof event.payload?.entityId === "string")
                this.evictAcceptedEntity(event.payload.entityId);
              break;
            case "VAULT:CONNECTION_ADDED":
            case "VAULT:CONNECTION_UPDATED":
            case "VAULT:CONNECTION_REMOVED":
              if (typeof event.payload?.sourceId === "string")
                this.evictAcceptedEntity(event.payload.sourceId);
              if (typeof event.payload?.targetId === "string")
                this.evictAcceptedEntity(event.payload.targetId);
              break;
            case "VAULT:SYNC_CHUNK_READY":
              if (!Array.isArray(event.payload?.newOrChangedIds)) break;
              for (const id of event.payload.newOrChangedIds) {
                if (typeof id !== "string") continue;
                this.evictAcceptedEntity(id);
              }
              break;
            case "VAULT:VAULT_SWITCHED":
            case "VAULT:VAULT_DELETED":
              this.reset();
              break;
          }
        },
        "generator-session-invalidation",
      );
    } catch {
      this.invalidationUnsub = () => {};
    }
    return this.invalidationUnsub;
  }

  destroy(): void {
    this.invalidationUnsub?.();
    this.invalidationUnsub = null;
  }
}

export const generatorSessionManager = new GeneratorSessionManager(
  appEventBus as unknown as GeneratorSessionInvalidationBus,
);
