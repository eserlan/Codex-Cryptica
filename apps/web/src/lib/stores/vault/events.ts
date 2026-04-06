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
  | { type: "BATCH_CREATED"; vaultId: string; entities: LocalEntity[] };

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
    // Process listeners in background to avoid blocking the emitter
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
}

export const vaultEventBus = new VaultEventBus();
