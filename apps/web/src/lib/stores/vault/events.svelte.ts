import { appEventBus, type AppEvent } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine";
import type { LocalEntity } from "./types";
import { systemClock } from "$lib/utils/runtime-deps";

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
      type: "CONNECTION_ADDED";
      vaultId: string;
      sourceId: string;
      targetId: string;
      connectionType: string;
      label?: string;
      strength?: number;
    }
  | {
      type: "CONNECTION_UPDATED";
      vaultId: string;
      sourceId: string;
      targetId: string;
      oldType: string;
      newType: string;
      newLabel?: string;
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
    const timestamp = systemClock.now();
    let appEvent: AppEvent | null = null;

    switch (event.type) {
      case "VAULT_OPENING":
        appEvent = {
          type: VAULT_EVENTS.VAULT_OPENING,
          domain: "vault",
          payload: {},
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "CACHE_LOADED":
        appEvent = {
          type: VAULT_EVENTS.CACHE_LOADED,
          domain: "vault",
          payload: { entities: Object.values(event.entities) },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "ENTITY_UPDATED":
        appEvent = {
          type: VAULT_EVENTS.ENTITY_UPDATED,
          domain: "vault",
          payload: {
            id: event.entity.id,
            patch: event.patch,
            entity: event.entity,
          },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "VAULT_SWITCHED":
        appEvent = {
          type: VAULT_EVENTS.VAULT_SWITCHED,
          domain: "vault",
          payload: { id: event.vaultId },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "ENTITY_DELETED":
        appEvent = {
          type: VAULT_EVENTS.ENTITY_DELETED,
          domain: "vault",
          payload: { entityId: event.entityId },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "BATCH_CREATED":
        appEvent = {
          type: VAULT_EVENTS.BATCH_CREATED,
          domain: "vault",
          payload: { entities: event.entities },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "BATCH_UPDATED":
        appEvent = {
          type: VAULT_EVENTS.BATCH_UPDATED,
          domain: "vault",
          payload: { entities: event.entities, patches: event.patches },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "SYNC_COMPLETE":
        appEvent = {
          type: VAULT_EVENTS.SYNC_COMPLETE,
          domain: "vault",
          payload: {},
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "SYNC_CHUNK_READY": {
        // ⚡ Bolt Optimization: Replace chained .map().filter() with a single imperative loop
        const entitiesChunk: LocalEntity[] = [];
        for (let i = 0; i < event.newOrChangedIds.length; i++) {
          const entity = event.entities[event.newOrChangedIds[i]];
          if (entity) {
            entitiesChunk.push(entity);
          }
        }
        appEvent = {
          type: VAULT_EVENTS.SYNC_CHUNK_READY,
          domain: "vault",
          payload: {
            newOrChangedIds: event.newOrChangedIds,
            entities: entitiesChunk,
          },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      }
      case "VAULT_DELETED":
        appEvent = {
          type: VAULT_EVENTS.VAULT_DELETED,
          domain: "vault",
          payload: { vaultId: event.vaultId },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "CONNECTION_ADDED":
        appEvent = {
          type: VAULT_EVENTS.CONNECTION_ADDED,
          domain: "vault",
          payload: {
            sourceId: event.sourceId,
            targetId: event.targetId,
            connectionType: event.connectionType,
            label: event.label,
            strength: event.strength,
          },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "CONNECTION_UPDATED":
        appEvent = {
          type: VAULT_EVENTS.CONNECTION_UPDATED,
          domain: "vault",
          payload: {
            sourceId: event.sourceId,
            targetId: event.targetId,
            oldType: event.oldType,
            newType: event.newType,
            newLabel: event.newLabel,
          },
          metadata: { timestamp, vaultId: event.vaultId },
        };
        break;
      case "CONNECTION_REMOVED":
        appEvent = {
          type: VAULT_EVENTS.CONNECTION_REMOVED,
          domain: "vault",
          payload: {
            sourceId: event.sourceId,
            targetId: event.targetId,
            connectionType: event.connectionType,
          },
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

/**
 * Runic utility that subscribes to the Vault Event Bus within an active Svelte 5 effect.
 * Automatically cleans up the subscription when the effect is destroyed.
 */
export function useVaultSubscription(
  listener: VaultEventListener,
  name?: string,
) {
  $effect(() => {
    const unsub = vaultEventBus.subscribe(listener, name);
    return unsub;
  });
}
