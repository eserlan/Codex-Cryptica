# Quickstart: AppEventBus

## 1. Subscribing to Events

```typescript
import { appEventBus } from "@codex/events";

// Subscribe to a specific event
const unsub = appEventBus.subscribe("VAULT:ENTITY_UPDATED", (event) => {
  console.log("Entity updated:", event.payload.id);
});

// Subscribe to an entire domain
const unsubscribeOracle = appEventBus.subscribe("ORACLE:*", (event) => {
  console.log("Oracle event received:", event.type);
});

// Don't forget to cleanup component-scoped listeners.
unsub();
unsubscribeOracle();
```

## 2. Emitting Events

```typescript
import { appEventBus } from "@codex/events";

// Local-only event
appEventBus.emit({
  type: "UI:SIDEBAR_TOGGLED",
  domain: "ui",
  payload: { open: true },
  metadata: { timestamp: Date.now() },
});

// Cross-tab synchronized event
appEventBus.emit({
  type: "ORACLE:UNDO_PERFORMED",
  domain: "oracle",
  payload: { messageId: "123" },
  metadata: { timestamp: Date.now(), sync: true }, // metadata.sync broadcasts to other tabs
});
```

## 3. Long-Lived Named Listeners

```typescript
import { appEventBus } from "@codex/events";

appEventBus.subscribe(
  "VAULT:*",
  (event) => {
    console.log("Long-lived vault listener:", event.type);
  },
  "my-service-listener",
);

// Registering the same name later replaces the previous listener.
// appEventBus.reset() clears anonymous listeners, but preserves named listeners.
```

## 4. Future Distributed Registry

Current examples use string literals because the first implementation has a centralized `AppEvent` union. The long-term proposal in `docs/ARCH_DISTRIBUTED_EVENTS.md` moves event constants and payload ownership into domain packages:

```typescript
import { appEventBus } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine";

appEventBus.subscribe(VAULT_EVENTS.ENTITY_UPDATED, (event) => {
  console.log(event.payload.id);
});
```
