import { appEventBus, type AppEvent } from "@codex/events";
import type { LocalEntity } from "./types";

export type VaultEvent =
  | { type: "VAULT_OPENING"; vaultId: string }
  | {
      type: "CACHE_LOADED";
      vaultId: string;
      entities: Record<string, LocalEntity>;
    }
  | {
      type: "SYNC_CHUNK_READY";
      vaultId: string;
      entities: Record<string, LocalEntity>;
      newOrChangedIds: string[];
    }
  | { type: "SYNC_COMPLETE"; vaultId: string }
  | {
      type: "ENTITY_UPDATED";
      vaultId: string;
      entity: LocalEntity;
      patch: Partial<LocalEntity>;
    }
  | { type: "ENTITY_DELETED"; vaultId: string; entityId: string }
  | { type: "BATCH_CREATED"; vaultId: string; entities: LocalEntity[] }
  | {
      type: "BATCH_UPDATED";
      vaultId: string;
      entities: LocalEntity[];
      patches?: Record<string, Partial<LocalEntity>>;
    }
  | {
      type: "CONNECTION_REMOVED";
      vaultId: string;
      sourceId: string;
      targetId: string;
      connectionType: string;
    }
  | { type: "VAULT_SWITCHED"; vaultId: string }
  | { type: "VAULT_DELETED"; vaultId: string };

type VaultEventListener = (event: VaultEvent) => void | Promise<void>;

export class VaultEventBus {
  private listeners = new Set<VaultEventListener>();
  private namedListeners = new Map<string, VaultEventListener>();

  subscribe(listener: VaultEventListener, name?: string) {
    if (name) {
      this.namedListeners.set(name, listener);
      return () => this.namedListeners.delete(name);
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(keepNamed = true) {
    this.listeners.clear();
    if (!keepNamed) {
      this.namedListeners.clear();
    }
  }

  emit(event: VaultEvent) {
    // 1. Bridge to AppEventBus
    this.bridgeToAppEventBus(event);

    // 2. Process legacy listeners
    const all = [...this.listeners, ...this.namedListeners.values()];
    for (const listener of all) {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          result.catch((err) =>
            console.error("[VaultEventBus] async listener error", err, event),
          );
        }
      } catch (err) {
        console.error("[VaultEventBus] listener error", err, event);
      }
    }
  }

  private bridgeToAppEventBus(event: VaultEvent) {
    const timestamp = Date.now();
    let appEvent: AppEvent | null = null;

    switch (event.type) {
      case "ENTITY_UPDATED":
        appEvent = {
          type: "VAULT:ENTITY_UPDATED",
          domain: "vault",
          payload: { id: event.entity.id, patch: event.patch },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "VAULT_SWITCHED":
        appEvent = {
          type: "VAULT:VAULT_SWITCHED",
          domain: "vault",
          payload: { id: event.vaultId },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "ENTITY_DELETED":
        appEvent = {
          type: "VAULT:ENTITY_DELETED",
          domain: "vault",
          payload: { entityId: event.entityId },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "BATCH_CREATED":
        appEvent = {
          type: "VAULT:BATCH_CREATED",
          domain: "vault",
          payload: { entities: event.entities },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "BATCH_UPDATED":
        appEvent = {
          type: "VAULT:BATCH_UPDATED",
          domain: "vault",
          payload: { entities: event.entities, patches: event.patches },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "SYNC_COMPLETE":
        appEvent = {
          type: "VAULT:SYNC_COMPLETE",
          domain: "vault",
          payload: {},
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "SYNC_CHUNK_READY":
        appEvent = {
          type: "VAULT:SYNC_CHUNK_READY",
          domain: "vault",
          payload: { newOrChangedIds: event.newOrChangedIds },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
    }

    if (appEvent) {
      appEventBus.emit(appEvent);
    }
  }
}

export const vaultEventBus = new VaultEventBus();
