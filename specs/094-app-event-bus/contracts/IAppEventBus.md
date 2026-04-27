# Contract: IAppEventBus

The `AppEventBus` exposes the following public interface for store and service coordination.

## Interface Definition

```typescript
export interface IAppEventBus {
  /**
   * Subscribe to specific event types or an entire domain.
   * @param filter - The event type (e.g., 'VAULT:ENTITY_UPDATED') or domain wildcard (e.g., 'VAULT:*').
   * @param listener - The callback function.
   * @param name - Optional globally unique name for the listener. Reusing a name replaces the previous registration.
   * @returns Unsubscribe function.
   */
  subscribe(
    filter: string | string[],
    listener: EventListener,
    name?: string,
  ): () => void;

  /**
   * Emit an event to all local listeners and optionally broadcast to other tabs.
   * @param event - The AppEvent payload.
   */
  emit(event: AppEvent): void;

  /**
   * Clear all non-named listeners. Named listeners are preserved so that
   * long-lived services (SearchService, CrossTabBroadcaster) survive vault switches.
   * Old unsubscribe closures MUST NOT remove newer listeners registered with
   * the same name.
   */
  reset(): void;
}
```

## Broadcasting Contract

Events with `metadata.sync: true` will be serialized via `JSON.stringify` and sent over a `BroadcastChannel` named `codex-system-events`. Receiving tabs will parse the message and re-emit locally with `metadata.remote: true` to prevent re-broadcast loops.

Remote messages are untrusted input. The broadcaster MUST ignore non-string messages, invalid JSON, and parsed values that do not contain a valid event envelope (`type`, `domain`, `payload`, and `metadata.timestamp`).

## Compatibility Contract

During migration, `VaultEventBus` MUST continue bridging legacy vault events into AppEvent equivalents before consumers move fully to `AppEventBus`. The bridge must preserve lifecycle/indexing events including `VAULT_OPENING`, `CACHE_LOADED`, `SYNC_CHUNK_READY`, and `SYNC_COMPLETE`.
