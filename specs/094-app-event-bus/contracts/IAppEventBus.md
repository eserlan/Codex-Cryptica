# Contract: IAppEventBus

The `AppEventBus` exposes the following public interface for store and service coordination.

## Interface Definition

```typescript
export interface IAppEventBus {
  /**
   * Subscribe to specific event types or an entire domain.
   * @param filter - The event type (e.g., 'VAULT:ENTITY_UPDATED') or domain wildcard (e.g., 'VAULT:*').
   * @param listener - The callback function.
   * @param name - Optional unique name for the listener to prevent duplicate registration.
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
   * Clear all non-named listeners.
   */
  reset(): void;
}
```

## Broadcasting Contract

Events with `sync: true` will be serialized via `JSON.stringify` and sent over a `BroadcastChannel` named `codex-system-events`. Receiving tabs will re-emit these events locally with a `remote: true` flag added to the metadata.
