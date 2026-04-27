# Quickstart: AppEventBus

## 1. Subscribing to Events

```typescript
import { appEventBus } from "@codex/events";

// Subscribe to a specific event
const unsub = appEventBus.subscribe("VAULT:ENTITY_UPDATED", (event) => {
  console.log("Entity updated:", event.payload.id);
});

// Subscribe to an entire domain
appEventBus.subscribe("ORACLE:*", (event) => {
  console.log("Oracle event received:", event.type);
});

// Don't forget to cleanup!
unsub();
```

## 2. Emitting Events

```typescript
import { appEventBus } from "@codex/events";

// Local-only event
appEventBus.emit({
  type: "UI:SIDEBAR_TOGGLED",
  domain: "ui",
  payload: { open: true },
  timestamp: Date.now(),
});

// Cross-tab synchronized event
appEventBus.emit({
  type: "ORACLE:UNDO_PERFORMED",
  domain: "oracle",
  payload: { messageId: "123" },
  sync: true, // This will be sent to other tabs
  timestamp: Date.now(),
});
```
